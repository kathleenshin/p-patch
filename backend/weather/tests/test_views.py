from unittest.mock import patch

from weather.services.air_quality import AirQualityServiceError
from weather.services.open_meteo import WeatherServiceError

from .fixtures import (
    AIR_QUALITY_UNAVAILABLE_DETAIL,
    OPEN_METEO_UNAVAILABLE_DETAIL,
    WeatherTestFixtures,
)


class WeatherViewTests(WeatherTestFixtures):
    def setUp(self):
        user = self.create_auth_user()

        self.client.defaults.update(
            self.auth_headers_for_user(user)
        )

    def test_requires_authentication(self):
        response = self.weather_get(
            client=self.client_class(),
            garden_id=self.garden_with_coordinates.id,
        )

        self.assertEqual(response.status_code, 401)

    def test_requires_garden_id(self):
        response = self.weather_get(
            client=self.client,
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["detail"],
            "Query parameter garden_id is required.",
        )

    def test_requires_integer_garden_id(self):
        response = self.weather_get(
            client=self.client,
            garden_id="abc",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["detail"],
            "garden_id must be an integer.",
        )

    def test_returns_404_for_unknown_garden(self):
        response = self.weather_get(
            client=self.client,
            garden_id=999999,
        )

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

    @patch("weather.views.AirQualityService.get_air_quality")
    @patch("weather.views.OpenMeteoService.get_forecast")
    def test_returns_weather_for_garden_coordinates(
        self,
        mock_get_forecast,
        mock_get_air_quality,
    ):
        mock_get_forecast.return_value = (
            self.sample_normalized_weather_payload()
        )
        mock_get_air_quality.return_value = (
            self.sample_air_quality_payload()
        )

        response = self.weather_get(
            client=self.client,
            garden_id=self.garden_with_coordinates.id,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            self.sample_view_payload(),
        )

        expected_coordinates = {
            "latitude": 47.6062,
            "longitude": -122.3321,
        }

        mock_get_forecast.assert_called_once_with(
            **expected_coordinates
        )
        mock_get_air_quality.assert_called_once_with(
            **expected_coordinates
        )

    @patch("weather.views.AirQualityService.get_air_quality")
    @patch("weather.views.OpenMeteoService.get_forecast")
    def test_returns_weather_when_air_quality_fails(
        self,
        mock_get_forecast,
        mock_get_air_quality,
    ):
        mock_get_forecast.return_value = (
            self.sample_normalized_weather_payload()
        )
        mock_get_air_quality.side_effect = AirQualityServiceError(
            AIR_QUALITY_UNAVAILABLE_DETAIL
        )

        response = self.weather_get(
            client=self.client,
            garden_id=self.garden_with_coordinates.id,
        )

        expected = {
            **self.sample_normalized_weather_payload(),
            "air_quality": {
                "current": {
                    "us_aqi": None,
                    "label": "Unavailable",
                },
                "forecast": [],
            },
        }

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), expected)

    @patch("weather.views.OpenMeteoService.get_forecast")
    def test_returns_502_when_weather_service_fails(
        self,
        mock_get_forecast,
    ):
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