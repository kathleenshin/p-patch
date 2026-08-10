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

        except (
            OpenMeteoError,
            KeyError,
            TypeError,
            IndexError,
        ) as exc:
            raise WeatherServiceError(
                "Unable to retrieve weather data."
            ) from exc

    @classmethod
    def _normalize(cls, payload):
        current = payload["current"]
        daily = payload["daily"]

        forecast = [
            cls._normalize_day(daily, index)
            for index in range(len(daily["time"]))
        ]

        weather_code = current["weather_code"]

        return {
            "current": {
                "temperature_f": current["temperature_2m"],
                "feels_like_f": current["apparent_temperature"],
                "humidity_percent": current[
                    "relative_humidity_2m"
                ],
                "weather_code": weather_code,
                "weather_description": description_for(
                    weather_code,
                    is_day=current.get("is_day", 1) != 0,
                ),
                "wind_speed_mph": current["wind_speed_10m"],
                "uv_index": daily["uv_index_max"][0],
                "precipitation_probability_percent": daily[
                    "precipitation_probability_max"
                ][0],
                "precipitation_inches": daily[
                    "precipitation_sum"
                ][0],
            },
            "forecast": forecast,
        }

    @staticmethod
    def _normalize_day(daily, index):
        weather_code = daily["weather_code"][index]

        return {
            "date": daily["time"][index],
            "weather_code": weather_code,
            "weather_description": description_for(
                weather_code,
                is_day=True,
            ),
            "high_temperature_f": daily[
                "temperature_2m_max"
            ][index],
            "low_temperature_f": daily[
                "temperature_2m_min"
            ][index],
            "precipitation_probability_percent": daily[
                "precipitation_probability_max"
            ][index],
            "precipitation_inches": daily[
                "precipitation_sum"
            ][index],
            "uv_index_max": daily[
                "uv_index_max"
            ][index],
        }