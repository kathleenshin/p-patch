from unittest.mock import patch
from datetime import timedelta

from django.utils import timezone
from django.test import override_settings
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

    @override_settings(USE_MOCK_WEATHER=True)
    @patch("weather.views.AirQualityService.get_air_quality")
    @patch("weather.views.OpenMeteoService.get_forecast")
    def test_mock_mode_returns_complete_payload_and_skips_live_services(
        self,
        mock_get_forecast,
        mock_get_air_quality,
    ):
        response = self.weather_get(
            client=self.client,
            garden_id=self.garden_with_coordinates.id,
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertIn("current", payload)
        self.assertIn("forecast", payload)
        self.assertIn("air_quality", payload)
        self.assertIn("current", payload["air_quality"])
        self.assertIn("forecast", payload["air_quality"])
        self.assertEqual(len(payload["forecast"]), 7)

        mock_get_forecast.assert_not_called()
        mock_get_air_quality.assert_not_called()

    @override_settings(USE_MOCK_WEATHER=True)
    def test_mock_mode_generates_seven_consecutive_dates(self):
        response = self.weather_get(
            client=self.client,
            garden_id=self.garden_with_coordinates.id,
        )

        self.assertEqual(response.status_code, 200)
        forecast = response.json()["forecast"]
        self.assertEqual(len(forecast), 7)

        today = timezone.localdate()
        expected_dates = [
            (today + timedelta(days=offset)).isoformat()
            for offset in range(7)
        ]
        self.assertEqual(
            [day["date"] for day in forecast],
            expected_dates,
        )

    @override_settings(USE_MOCK_WEATHER=True)
    def test_mock_mode_still_validates_coordinates(self):
        response = self.weather_get(
            client=self.client,
            garden_id=self.garden_without_coordinates.id,
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["detail"],
            "Garden does not have coordinates.",
        )

    @override_settings(USE_MOCK_WEATHER=False)
    @patch("weather.views.AirQualityService.get_air_quality")
    @patch("weather.views.OpenMeteoService.get_forecast")
    def test_live_mode_still_uses_provider_services(
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
        mock_get_forecast.assert_called_once()
        mock_get_air_quality.assert_called_once()