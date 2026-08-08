from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework_simplejwt.tokens import AccessToken

from plots.models import Garden

from .services.air_quality import AirQualityService, AirQualityServiceError
from .services.open_meteo import OpenMeteoService, WeatherServiceError
from .services.open_meteo_client import OpenMeteoError


WEATHER_FORECAST_URL_NAME = "weather-forecast"
AUTH_TEST_EMAIL = "weather-test@example.com"
AUTH_TEST_PASSWORD = "password123"
OPEN_METEO_UNAVAILABLE_DETAIL = "Unable to retrieve valid weather data."
AIR_QUALITY_UNAVAILABLE_DETAIL = "Unable to retrieve valid air quality data."


class WeatherTestFixtures(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.garden_with_coordinates = Garden.objects.create(
            name="Judkins Park P-Patch",
            latitude=47.6062,
            longitude=-122.3321,
        )

        cls.garden_without_coordinates = Garden.objects.create(
            name="No Coordinates Garden",
        )

    @staticmethod
    def weather_url():
        return reverse(WEATHER_FORECAST_URL_NAME)

    @staticmethod
    def auth_headers_for_user(user):
        token = str(AccessToken.for_user(user))
        return {"HTTP_AUTHORIZATION": f"Bearer {token}"}

    @staticmethod
    def create_auth_user():
        return get_user_model().objects.create_user(
            email=AUTH_TEST_EMAIL,
            password=AUTH_TEST_PASSWORD,
        )

    def weather_get(self, client, garden_id=None):
        params = {}
        if garden_id is not None:
            params["garden_id"] = garden_id
        return client.get(self.weather_url(), params)

    @staticmethod
    def sample_raw_weather_payload():
        return {
            "current": {
                "temperature_2m": 70.0,
                "apparent_temperature": 69.0,
                "relative_humidity_2m": 55,
                "weather_code": 1,
                "wind_speed_10m": 5.0,
            },
            "daily": {
                "time": ["2026-08-01", "2026-08-02"],
                "weather_code": [1, 2],
                "temperature_2m_max": [75.0, 74.0],
                "temperature_2m_min": [56.0, 55.0],
                "precipitation_probability_max": [10, 20],
                "precipitation_sum": [0.0, 0.1],
                "uv_index_max": [5.4, 4.7],
            },
        }

    @staticmethod
    def sample_normalized_weather_payload():
        return {
            "current": {
                "temperature_f": 70.0,
                "feels_like_f": 69.0,
                "humidity_percent": 55,
                "weather_code": 1,
                "weather_description": "Mainly Sunny",
                "wind_speed_mph": 5.0,
                "uv_index": 5.4,
                "precipitation_probability_percent": 10,
                "precipitation_inches": 0.0,
            },
            "forecast": [
                {
                    "date": "2026-08-01",
                    "weather_code": 1,
                    "weather_description": "Mainly Sunny",
                    "high_temperature_f": 75.0,
                    "low_temperature_f": 56.0,
                    "precipitation_probability_percent": 10,
                    "precipitation_inches": 0.0,
                    "uv_index_max": 5.4,
                },
                {
                    "date": "2026-08-02",
                    "weather_code": 2,
                    "weather_description": "Partly Cloudy",
                    "high_temperature_f": 74.0,
                    "low_temperature_f": 55.0,
                    "precipitation_probability_percent": 20,
                    "precipitation_inches": 0.1,
                    "uv_index_max": 4.7,
                },
            ],
        }

    @staticmethod
    def sample_air_quality_raw_payload():
        return {
            "hourly": {
                "us_aqi": [42],
            }
        }

    @staticmethod
    def sample_air_quality_payload():
        return {
            "us_aqi": 42,
            "label": "Good",
        }

    def sample_view_payload(self):
        payload = self.sample_normalized_weather_payload()
        payload["air_quality"] = self.sample_air_quality_payload()
        return payload


class WeatherViewTests(WeatherTestFixtures):
    def setUp(self):
        user = self.create_auth_user()
        self.client.defaults.update(self.auth_headers_for_user(user))

    def test_requires_authentication(self):
        response = self.weather_get(
            client=self.client_class(),
            garden_id=self.garden_with_coordinates.id,
        )

        self.assertEqual(response.status_code, 401)

    def test_requires_garden_id(self):
        response = self.weather_get(client=self.client)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["detail"],
            "Query parameter garden_id is required.",
        )

    def test_returns_404_for_unknown_garden(self):
        response = self.weather_get(client=self.client, garden_id=999999)

        self.assertEqual(response.status_code, 404)

    def test_requires_garden_coordinates(self):
        response = self.weather_get(
            client=self.client,
            garden_id=self.garden_without_coordinates.id,
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["detail"],
            "Garden does not have coordinates.",
        )

    @patch("weather.views.AirQualityService.get_current")
    @patch("weather.views.OpenMeteoService.get_forecast")
    def test_uses_garden_coordinates(
        self,
        mock_get_forecast,
        mock_get_air_quality,
    ):
        mock_get_forecast.return_value = self.sample_normalized_weather_payload()
        mock_get_air_quality.return_value = self.sample_air_quality_payload()

        response = self.weather_get(
            client=self.client,
            garden_id=self.garden_with_coordinates.id,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), self.sample_view_payload())

        mock_get_forecast.assert_called_once_with(
            latitude=47.6062,
            longitude=-122.3321,
        )
        mock_get_air_quality.assert_called_once_with(
            latitude=47.6062,
            longitude=-122.3321,
        )

    @patch("weather.views.AirQualityService.get_current")
    @patch("weather.views.OpenMeteoService.get_forecast")
    def test_returns_weather_when_air_quality_fails(
        self,
        mock_get_forecast,
        mock_get_air_quality,
    ):
        mock_get_forecast.return_value = self.sample_normalized_weather_payload()
        mock_get_air_quality.side_effect = AirQualityServiceError(
            AIR_QUALITY_UNAVAILABLE_DETAIL
        )

        response = self.weather_get(
            client=self.client,
            garden_id=self.garden_with_coordinates.id,
        )

        expected = self.sample_normalized_weather_payload()
        expected["air_quality"] = {
            "us_aqi": None,
            "label": "Unavailable",
        }

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), expected)

    @patch("weather.views.OpenMeteoService.get_forecast")
    def test_returns_502_when_weather_service_fails(self, mock_get_forecast):
        mock_get_forecast.side_effect = WeatherServiceError(
            OPEN_METEO_UNAVAILABLE_DETAIL
        )

        response = self.weather_get(
            client=self.client,
            garden_id=self.garden_with_coordinates.id,
        )

        self.assertEqual(response.status_code, 502)
        self.assertEqual(
            response.json()["detail"],
            OPEN_METEO_UNAVAILABLE_DETAIL,
        )

    def test_requires_integer_garden_id(self):
        response = self.weather_get(client=self.client, garden_id="abc")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["detail"],
            "garden_id must be an integer.",
        )


class OpenMeteoServiceTests(WeatherTestFixtures):
    @patch("weather.services.open_meteo.OpenMeteoClient.get")
    def test_get_forecast_normalizes_open_meteo_payload(
        self,
        mock_client_get,
    ):
        mock_client_get.return_value = self.sample_raw_weather_payload()

        weather = OpenMeteoService.get_forecast(
            latitude=47.6062,
            longitude=-122.3321,
        )

        self.assertEqual(weather, self.sample_normalized_weather_payload())

    @patch("weather.services.open_meteo.OpenMeteoClient.get")
    def test_get_forecast_sends_expected_request_parameters(
        self,
        mock_client_get,
    ):
        mock_client_get.return_value = self.sample_raw_weather_payload()

        OpenMeteoService.get_forecast(
            latitude=47.6062,
            longitude=-122.3321,
        )

        mock_client_get.assert_called_once_with(
            OpenMeteoService.BASE_URL,
            {
                "latitude": 47.6062,
                "longitude": -122.3321,
                "current": [
                    "temperature_2m",
                    "apparent_temperature",
                    "relative_humidity_2m",
                    "weather_code",
                    "wind_speed_10m",
                ],
                "daily": [
                    "weather_code",
                    "temperature_2m_max",
                    "temperature_2m_min",
                    "precipitation_probability_max",
                    "precipitation_sum",
                    "uv_index_max",
                ],
                "temperature_unit": "fahrenheit",
                "wind_speed_unit": "mph",
                "precipitation_unit": "inch",
                "forecast_days": 7,
            },
        )

    @patch("weather.services.open_meteo.OpenMeteoClient.get")
    def test_get_forecast_raises_error_on_request_failure(
        self,
        mock_client_get,
    ):
        mock_client_get.side_effect = OpenMeteoError("boom")

        with self.assertRaisesRegex(
            WeatherServiceError,
            OPEN_METEO_UNAVAILABLE_DETAIL,
        ):
            OpenMeteoService.get_forecast(
                latitude=47.6062,
                longitude=-122.3321,
            )

    @patch("weather.services.open_meteo.OpenMeteoClient.get")
    def test_get_forecast_raises_error_for_malformed_payload(
        self,
        mock_client_get,
    ):
        mock_client_get.return_value = {
            "current": {},
            "daily": {},
        }

        with self.assertRaisesRegex(
            WeatherServiceError,
            OPEN_METEO_UNAVAILABLE_DETAIL,
        ):
            OpenMeteoService.get_forecast(
                latitude=47.6062,
                longitude=-122.3321,
            )


class AirQualityServiceTests(WeatherTestFixtures):
    @patch("weather.services.air_quality.OpenMeteoClient.get")
    def test_get_current_normalizes_payload(
        self,
        mock_client_get,
    ):
        mock_client_get.return_value = self.sample_air_quality_raw_payload()

        air_quality = AirQualityService.get_current(
            latitude=47.6062,
            longitude=-122.3321,
        )

        self.assertEqual(air_quality, self.sample_air_quality_payload())

    @patch("weather.services.air_quality.OpenMeteoClient.get")
    def test_get_current_sends_expected_request_parameters(
        self,
        mock_client_get,
    ):
        mock_client_get.return_value = self.sample_air_quality_raw_payload()

        AirQualityService.get_current(
            latitude=47.6062,
            longitude=-122.3321,
        )

        mock_client_get.assert_called_once_with(
            AirQualityService.BASE_URL,
            {
                "latitude": 47.6062,
                "longitude": -122.3321,
                "hourly": ["us_aqi"],
                "forecast_days": 1,
            },
        )

    @patch("weather.services.air_quality.OpenMeteoClient.get")
    def test_get_current_raises_error_on_request_failure(
        self,
        mock_client_get,
    ):
        mock_client_get.side_effect = OpenMeteoError("boom")

        with self.assertRaisesRegex(
            AirQualityServiceError,
            AIR_QUALITY_UNAVAILABLE_DETAIL,
        ):
            AirQualityService.get_current(
                latitude=47.6062,
                longitude=-122.3321,
            )

    @patch("weather.services.air_quality.OpenMeteoClient.get")
    def test_get_current_raises_error_for_malformed_payload(
        self,
        mock_client_get,
    ):
        mock_client_get.return_value = {
            "hourly": {
                "us_aqi": [None],
            }
        }

        with self.assertRaisesRegex(
            AirQualityServiceError,
            AIR_QUALITY_UNAVAILABLE_DETAIL,
        ):
            AirQualityService.get_current(
                latitude=47.6062,
                longitude=-122.3321,
            )
