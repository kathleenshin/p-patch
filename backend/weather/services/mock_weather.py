"""Temporary Seattle-focused mock weather payload for demo stability.

This module is used only when USE_MOCK_WEATHER=True so deployments can avoid
external provider rate limits (e.g. Open-Meteo 429s on Render).
"""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from .air_quality import AirQualityService
from .weather_codes import description_for


class MockWeatherService:
    """Returns normalized mock data matching the live weather API contract."""

    # Seeded from an actual Seattle Open-Meteo snapshot on 2026-08-10,
    # but dates are regenerated dynamically from timezone.localdate().
    _FORECAST_PROFILE = [
        {
            "weather_code": 3,  # overcast
            "high_temperature_f": 72.4,
            "low_temperature_f": 55.0,
            "precipitation_probability_percent": 1,
            "precipitation_inches": 0.00,
            "uv_index_max": 5.95,
            "us_aqi_average": 46,
        },
        {
            "weather_code": 0,  # clear sky
            "high_temperature_f": 75.7,
            "low_temperature_f": 56.2,
            "precipitation_probability_percent": 3,
            "precipitation_inches": 0.00,
            "uv_index_max": 6.8,
            "us_aqi_average": 52,
        },
        {
            "weather_code": 3,  # overcast
            "high_temperature_f": 77.9,
            "low_temperature_f": 56.3,
            "precipitation_probability_percent": 3,
            "precipitation_inches": 0.00,
            "uv_index_max": 6.65,
            "us_aqi_average": 58,
        },
        {
            "weather_code": 0,  # clear sky
            "high_temperature_f": 83.8,
            "low_temperature_f": 56.4,
            "precipitation_probability_percent": 1,
            "precipitation_inches": 0.00,
            "uv_index_max": 6.6,
            "us_aqi_average": 54,
        },
        {
            "weather_code": 3,  # overcast
            "high_temperature_f": 88.1,
            "low_temperature_f": 56.4,
            "precipitation_probability_percent": 0,
            "precipitation_inches": 0.00,
            "uv_index_max": 6.65,
            "us_aqi_average": 49,
        },
        {
            "weather_code": 3,  # overcast
            "high_temperature_f": 83.8,
            "low_temperature_f": 55.3,
            "precipitation_probability_percent": 1,
            "precipitation_inches": 0.00,
            "uv_index_max": 6.05,
            "us_aqi_average": 56,
        },
        {
            "weather_code": 3,  # overcast
            "high_temperature_f": 82.4,
            "low_temperature_f": 53.7,
            "precipitation_probability_percent": 2,
            "precipitation_inches": 0.00,
            "uv_index_max": 5.85,
            "us_aqi_average": 44,
        },
    ]

    @classmethod
    def get_forecast(cls, latitude: float, longitude: float) -> dict:
        # Parameters are accepted to match the live service interface.
        _ = (latitude, longitude)

        base_date = timezone.localdate()
        forecast = []
        air_quality_forecast = []

        for index, day in enumerate(cls._FORECAST_PROFILE):
            date_value = (base_date + timedelta(days=index)).isoformat()
            weather_code = day["weather_code"]
            aqi_average = day["us_aqi_average"]

            forecast.append(
                {
                    "date": date_value,
                    "weather_code": weather_code,
                    "weather_description": description_for(
                        weather_code,
                        is_day=True,
                    ),
                    "high_temperature_f": day["high_temperature_f"],
                    "low_temperature_f": day["low_temperature_f"],
                    "precipitation_probability_percent": day[
                        "precipitation_probability_percent"
                    ],
                    "precipitation_inches": day["precipitation_inches"],
                    "uv_index_max": day["uv_index_max"],
                }
            )

            air_quality_forecast.append(
                {
                    "date": date_value,
                    "us_aqi_average": aqi_average,
                    "label": AirQualityService._label_for(aqi_average),
                }
            )

        today = cls._FORECAST_PROFILE[0]
        current_code = today["weather_code"]
        current_aqi = 47

        return {
            "current": {
                "temperature_f": 70.0,
                "feels_like_f": 71.3,
                "humidity_percent": 63,
                "weather_code": current_code,
                "weather_description": description_for(
                    current_code,
                    is_day=True,
                ),
                "wind_speed_mph": 2.0,
                "uv_index": today["uv_index_max"],
                "precipitation_probability_percent": today[
                    "precipitation_probability_percent"
                ],
                "precipitation_inches": today["precipitation_inches"],
            },
            "forecast": forecast,
            "air_quality": {
                "current": {
                    "us_aqi": current_aqi,
                    "label": AirQualityService._label_for(current_aqi),
                },
                "forecast": air_quality_forecast,
            },
        }
