"""
Retrieves current conditions and a seven-day forecast from Open-Meteo.

The provider response is normalized into a frontend-friendly structure.
"""

from .open_meteo_client import OpenMeteoClient, OpenMeteoError
from .weather_codes import description_for


class WeatherServiceError(Exception):
    """Raised when weather data cannot be retrieved."""


class OpenMeteoService:
    BASE_URL = "https://api.open-meteo.com/v1/forecast"

    CURRENT_FIELDS = [
        "temperature_2m",
        "apparent_temperature",
        "relative_humidity_2m",
        "weather_code",
        "is_day",
        "wind_speed_10m",
    ]

    DAILY_FIELDS = [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_probability_max",
        "precipitation_sum",
        "uv_index_max",
    ]

    @classmethod
    def get_forecast(cls, latitude, longitude):
        try:
            payload = OpenMeteoClient.get(
                cls.BASE_URL,
                {
                    "latitude": latitude,
                    "longitude": longitude,
                    "current": cls.CURRENT_FIELDS,
                    "daily": cls.DAILY_FIELDS,
                    "temperature_unit": "fahrenheit",
                    "wind_speed_unit": "mph",
                    "precipitation_unit": "inch",
                    "forecast_days": 7,
                },
            )

            return cls._normalize(payload)

        except OpenMeteoError as exc:
            raise WeatherServiceError(
                "Unable to retrieve weather data."
            ) from exc
        except (KeyError, TypeError, IndexError) as exc:
            raise WeatherServiceError(
                "Unable to normalize weather data."
            ) from exc

    @staticmethod
    def _first(values):
        if not values:
            return None
        return values[0]

    @classmethod
    def _normalize(cls, payload):
        current = payload.get("current") or {}
        daily = payload.get("daily") or {}

        times = daily.get("time") or []

        forecast = [
            cls._normalize_day(daily, index)
            for index in range(len(times))
        ]

        weather_code = current.get("weather_code")

        return {
            "current": {
                "temperature_f": current.get("temperature_2m"),
                "feels_like_f": current.get("apparent_temperature"),
                "humidity_percent": current.get(
                    "relative_humidity_2m"
                ),
                "weather_code": weather_code,
                "weather_description": (
                    description_for(
                        weather_code,
                        is_day=current.get("is_day", 1) != 0,
                    )
                    if weather_code is not None
                    else "Unavailable"
                ),
                "wind_speed_mph": current.get("wind_speed_10m"),
                "uv_index": cls._first(
                    daily.get("uv_index_max")
                ),
                "precipitation_probability_percent": cls._first(
                    daily.get("precipitation_probability_max")
                ),
                "precipitation_inches": cls._first(
                    daily.get("precipitation_sum")
                ),
            },
            "forecast": forecast,
        }

    @classmethod
    def _normalize_day(cls, daily, index):
        weather_codes = daily.get("weather_code") or []
        times = daily.get("time") or []
        highs = daily.get("temperature_2m_max") or []
        lows = daily.get("temperature_2m_min") or []
        precip_probabilities = (
            daily.get("precipitation_probability_max") or []
        )
        precipitation = daily.get("precipitation_sum") or []
        uv_indexes = daily.get("uv_index_max") or []

        weather_code = (
            weather_codes[index]
            if index < len(weather_codes)
            else None
        )

        return {
            "date": times[index] if index < len(times) else None,
            "weather_code": weather_code,
            "weather_description": (
                description_for(
                    weather_code,
                    is_day=True,
                )
                if weather_code is not None
                else "Unavailable"
            ),
            "high_temperature_f": (
                highs[index]
                if index < len(highs)
                else None
            ),
            "low_temperature_f": (
                lows[index]
                if index < len(lows)
                else None
            ),
            "precipitation_probability_percent": (
                precip_probabilities[index]
                if index < len(precip_probabilities)
                else None
            ),
            "precipitation_inches": (
                precipitation[index]
                if index < len(precipitation)
                else None
            ),
            "uv_index_max": (
                uv_indexes[index]
                if index < len(uv_indexes)
                else None
            ),
        }