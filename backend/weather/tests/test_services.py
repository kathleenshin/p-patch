from datetime import datetime
from unittest.mock import patch

from weather.services.air_quality import (
    AirQualityService,
    AirQualityServiceError,
)
from weather.services.open_meteo import (
    OpenMeteoService,
    WeatherServiceError,
)
from weather.services.open_meteo_client import OpenMeteoError

from .fixtures import (
    AIR_QUALITY_UNAVAILABLE_DETAIL,
    OPEN_METEO_UNAVAILABLE_DETAIL,
    WeatherTestFixtures,
)


class OpenMeteoServiceTests(WeatherTestFixtures):
    @patch("weather.services.open_meteo.OpenMeteoClient.get")
    def test_get_forecast_normalizes_payload(
        self,
        mock_client_get,
    ):
        mock_client_get.return_value = (
            self.sample_raw_weather_payload()
        )

        weather = OpenMeteoService.get_forecast(
            latitude=47.6062,
            longitude=-122.3321,
        )

        self.assertEqual(
            weather,
            self.sample_normalized_weather_payload(),
        )

    @patch("weather.services.open_meteo.OpenMeteoClient.get")
    def test_get_forecast_uses_nighttime_description(
        self,
        mock_client_get,
    ):
        payload = self.sample_raw_weather_payload()
        payload["current"]["is_day"] = 0

        mock_client_get.return_value = payload

        weather = OpenMeteoService.get_forecast(
            latitude=47.6062,
            longitude=-122.3321,
        )

        self.assertEqual(
            weather["current"]["weather_description"],
            "Mainly Clear",
        )

    @patch("weather.services.open_meteo.OpenMeteoClient.get")
    def test_get_forecast_sends_expected_request(
        self,
        mock_client_get,
    ):
        mock_client_get.return_value = (
            self.sample_raw_weather_payload()
        )

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
                    "is_day",
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
    @patch("weather.services.air_quality.datetime")
    @patch("weather.services.air_quality.OpenMeteoClient.get")
    def test_get_air_quality_normalizes_current_and_forecast(
        self,
        mock_client_get,
        mock_datetime,
    ):
        mock_client_get.return_value = (
            self.sample_air_quality_raw_payload()
        )

        mock_datetime.now.return_value = datetime(
            2026,
            8,
            8,
            0,
            30,
        )

        air_quality = AirQualityService.get_air_quality(
            latitude=47.6062,
            longitude=-122.3321,
        )

        self.assertEqual(
            air_quality,
            self.sample_air_quality_payload(),
        )

    @patch("weather.services.air_quality.datetime")
    @patch("weather.services.air_quality.OpenMeteoClient.get")
    def test_get_air_quality_ignores_null_values(
        self,
        mock_client_get,
        mock_datetime,
    ):
        mock_client_get.return_value = {
            "hourly": {
                "time": [
                    "2026-08-08T00:00",
                    "2026-08-08T01:00",
                    "2026-08-08T02:00",
                ],
                "us_aqi": [
                    42,
                    None,
                    62,
                ],
            }
        }

        mock_datetime.now.return_value = datetime(
            2026,
            8,
            8,
            0,
            30,
        )

        air_quality = AirQualityService.get_air_quality(
            latitude=47.6062,
            longitude=-122.3321,
        )

        self.assertEqual(
            air_quality["current"]["us_aqi"],
            42,
        )
        self.assertEqual(
            air_quality["forecast"][0]["us_aqi_average"],
            52,
        )

    @patch("weather.services.air_quality.OpenMeteoClient.get")
    def test_get_air_quality_sends_one_seven_day_request(
        self,
        mock_client_get,
    ):
        mock_client_get.return_value = (
            self.sample_air_quality_raw_payload()
        )

        AirQualityService.get_air_quality(
            latitude=47.6062,
            longitude=-122.3321,
        )

        mock_client_get.assert_called_once_with(
            AirQualityService.BASE_URL,
            {
                "latitude": 47.6062,
                "longitude": -122.3321,
                "hourly": ["us_aqi"],
                "forecast_days": 7,
            },
        )

    @patch("weather.services.air_quality.OpenMeteoClient.get")
    def test_get_air_quality_raises_error_on_request_failure(
        self,
        mock_client_get,
    ):
        mock_client_get.side_effect = OpenMeteoError("boom")

        with self.assertRaisesRegex(
            AirQualityServiceError,
            AIR_QUALITY_UNAVAILABLE_DETAIL,
        ):
            AirQualityService.get_air_quality(
                latitude=47.6062,
                longitude=-122.3321,
            )

    @patch("weather.services.air_quality.OpenMeteoClient.get")
    def test_get_air_quality_raises_error_for_malformed_payload(
        self,
        mock_client_get,
    ):
        mock_client_get.return_value = {
            "hourly": {},
        }

        with self.assertRaisesRegex(
            AirQualityServiceError,
            AIR_QUALITY_UNAVAILABLE_DETAIL,
        ):
            AirQualityService.get_air_quality(
                latitude=47.6062,
                longitude=-122.3321,
            )