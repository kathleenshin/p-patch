import requests
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework_simplejwt.tokens import AccessToken

from plots.models import Garden

from .services.open_meteo import OpenMeteoService, WeatherServiceError


WEATHER_FORECAST_URL_NAME = "weather-forecast"
AUTH_TEST_EMAIL = "weather-test@example.com"
AUTH_TEST_PASSWORD = "password123"
OPEN_METEO_UNAVAILABLE_DETAIL = "Unable to retrieve weather data from Open-Meteo."


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
    def sample_raw_payload():
        return {
            "current": {
                "temperature_2m": 70.0,
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
            },
        }

    @staticmethod
    def sample_normalized_payload():
        return {
            "current": {
                "temperature_f": 70.0,
                "weather_code": 1,
                "wind_speed_mph": 5.0,
            },
            "forecast": [
                {
                    "date": "2026-08-01",
                    "weather_code": 1,
                    "high_temperature_f": 75.0,
                    "low_temperature_f": 56.0,
                    "precipitation_probability_percent": 10,
                    "precipitation_inches": 0.0,
                },
                {
                    "date": "2026-08-02",
                    "weather_code": 2,
                    "high_temperature_f": 74.0,
                    "low_temperature_f": 55.0,
                    "precipitation_probability_percent": 20,
                    "precipitation_inches": 0.1,
                },
            ],
        }

    @staticmethod
    def build_success_response(payload):
        response = Mock()
        response.raise_for_status.return_value = None
        response.json.return_value = payload
        return response


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

    @patch("weather.views.OpenMeteoService.get_forecast")
    def test_uses_garden_coordinates(self, mock_get_forecast):
        mock_get_forecast.return_value = self.sample_normalized_payload()

        response = self.weather_get(
            client=self.client,
            garden_id=self.garden_with_coordinates.id,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            self.sample_normalized_payload(),
        )

        mock_get_forecast.assert_called_once_with(
            latitude=47.6062,
            longitude=-122.3321,
        )

    @patch("weather.views.OpenMeteoService.get_forecast")
    def test_returns_502_when_service_fails(self, mock_get_forecast):
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
    @patch("weather.services.open_meteo.requests.get")
    def test_get_forecast_normalizes_open_meteo_payload(
        self,
        mock_get,
    ):
        mock_get.return_value = self.build_success_response(
            self.sample_raw_payload()
        )

        weather = OpenMeteoService.get_forecast(
            latitude=47.6062,
            longitude=-122.3321,
        )

        self.assertEqual(
            weather,
            self.sample_normalized_payload(),
        )

    @patch("weather.services.open_meteo.requests.get")
    def test_get_forecast_sends_expected_request_parameters(
        self,
        mock_get,
    ):
        mock_get.return_value = self.build_success_response(
            self.sample_raw_payload()
        )

        OpenMeteoService.get_forecast(
            latitude=47.6062,
            longitude=-122.3321,
        )

        mock_get.assert_called_once_with(
            OpenMeteoService.BASE_URL,
            params={
                "latitude": 47.6062,
                "longitude": -122.3321,
                "current": [
                    "temperature_2m",
                    "weather_code",
                    "wind_speed_10m",
                ],
                "daily": [
                    "weather_code",
                    "temperature_2m_max",
                    "temperature_2m_min",
                    "precipitation_probability_max",
                    "precipitation_sum",
                ],
                "temperature_unit": "fahrenheit",
                "wind_speed_unit": "mph",
                "precipitation_unit": "inch",
                "timezone": OpenMeteoService.TIMEZONE,
                "forecast_days": 7,
            },
            timeout=10,
        )

    @patch("weather.services.open_meteo.requests.get")
    def test_get_forecast_raises_error_on_request_failure(
        self,
        mock_get,
    ):
        mock_get.side_effect = requests.RequestException("boom")

        with self.assertRaisesRegex(
            WeatherServiceError,
            OPEN_METEO_UNAVAILABLE_DETAIL,
        ):
            OpenMeteoService.get_forecast(
                latitude=47.6062,
                longitude=-122.3321,
            )

    @patch("weather.services.open_meteo.requests.get")
    def test_get_forecast_raises_error_for_non_200_response(
        self,
        mock_get,
    ):
        response = Mock()
        response.raise_for_status.side_effect = requests.HTTPError(
            "Service unavailable"
        )
        mock_get.return_value = response

        with self.assertRaisesRegex(
            WeatherServiceError,
            OPEN_METEO_UNAVAILABLE_DETAIL,
        ):
            OpenMeteoService.get_forecast(
                latitude=47.6062,
                longitude=-122.3321,
            )

    @patch("weather.services.open_meteo.requests.get")
    def test_get_forecast_raises_error_for_malformed_payload(
        self,
        mock_get,
    ):
        mock_get.return_value = self.build_success_response(
            {
                "current": {},
                "daily": {},
            }
        )

        with self.assertRaisesRegex(
            WeatherServiceError,
            "Open-Meteo returned invalid weather data.",
        ):
            OpenMeteoService.get_forecast(
                latitude=47.6062,
                longitude=-122.3321,
            )