from unittest.mock import patch

from django.core.cache import cache

from weather.services.air_quality import AirQualityServiceError
from weather.services.open_meteo import WeatherServiceError

from .fixtures import (
    AIR_QUALITY_UNAVAILABLE_DETAIL,
    OPEN_METEO_UNAVAILABLE_DETAIL,
    WeatherTestFixtures,
)


class WeatherViewTests(WeatherTestFixtures):
    def setUp(self):
        cache.clear()

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
    def test_uses_cached_weather_and_air_quality_without_refetching(
        self,
        mock_get_forecast,
        mock_get_air_quality,
    ):
        cache.set(
            self.weather_cache_key(
                self.garden_with_coordinates
            ),
            self.sample_normalized_weather_payload(),
            timeout=600,
        )

        cache.set(
            self.air_quality_cache_key(
                self.garden_with_coordinates
            ),
            self.sample_air_quality_payload(),
            timeout=600,
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

        mock_get_forecast.assert_not_called()
        mock_get_air_quality.assert_not_called()

    @patch("weather.views.AirQualityService.get_air_quality")
    @patch("weather.views.OpenMeteoService.get_forecast")
    def test_successful_provider_responses_are_cached(
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

        self.weather_get(
            client=self.client,
            garden_id=self.garden_with_coordinates.id,
        )

        cached_weather = cache.get(
            self.weather_cache_key(
                self.garden_with_coordinates
            )
        )

        cached_air_quality = cache.get(
            self.air_quality_cache_key(
                self.garden_with_coordinates
            )
        )

        self.assertEqual(
            cached_weather,
            self.sample_normalized_weather_payload(),
        )
        self.assertEqual(
            cached_air_quality,
            self.sample_air_quality_payload(),
        )

    @patch("weather.views.AirQualityService.get_air_quality")
    @patch("weather.views.OpenMeteoService.get_forecast")
    def test_weather_failure_returns_and_caches_fallback(
        self,
        mock_get_forecast,
        mock_get_air_quality,
    ):
        mock_get_forecast.side_effect = WeatherServiceError(
            OPEN_METEO_UNAVAILABLE_DETAIL
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
            response.json()["current"]["weather_description"],
            "Unavailable",
        )
        self.assertEqual(
            response.json()["forecast"],
            [],
        )

        cached_weather = cache.get(
            self.weather_cache_key(
                self.garden_with_coordinates
            )
        )

        self.assertIsNotNone(cached_weather)
        self.assertEqual(
            cached_weather["current"]["weather_description"],
            "Unavailable",
        )

    @patch("weather.views.AirQualityService.get_air_quality")
    @patch("weather.views.OpenMeteoService.get_forecast")
    def test_air_quality_failure_returns_and_caches_fallback(
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

        expected_air_quality = {
            "current": {
                "us_aqi": None,
                "label": "Unavailable",
            },
            "forecast": [],
        }

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["air_quality"],
            expected_air_quality,
        )

        cached_air_quality = cache.get(
            self.air_quality_cache_key(
                self.garden_with_coordinates
            )
        )

        self.assertEqual(
            cached_air_quality,
            expected_air_quality,
        )