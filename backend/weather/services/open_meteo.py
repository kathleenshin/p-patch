"""
Retrieves current conditions and a seven-day forecast from Open-Meteo.

The provider response is normalized into a frontend-friendly structure.
"""

import requests


class WeatherServiceError(Exception):
    """Raised when weather data cannot be retrieved."""


class OpenMeteoService:
    BASE_URL = "https://api.open-meteo.com/v1/forecast"
    TIMEZONE = "America/Los_Angeles"

    # TODO: Implement caching to reduce the number of requests to Open-Meteo.
    @classmethod
    def get_forecast(cls, latitude, longitude):
        try:
            response = requests.get(
                cls.BASE_URL,
                params={
                    "latitude": latitude,
                    "longitude": longitude,
                    "current": [
                        "temperature_2m",
                        "apparent_temperature",
                        "relative_humidity_2m",
                        "weather_code",
                        "wind_speed_10m",
                        "surface_pressure",
                        "visibility",
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
                    "timezone": cls.TIMEZONE,
                    "forecast_days": 7,
                },
                timeout=10,
            )

            response.raise_for_status()

        except requests.RequestException as exc:
            raise WeatherServiceError(
                "Unable to retrieve weather data from Open-Meteo."
            ) from exc

        try:
            return cls._normalize(response.json())
        except (KeyError, TypeError, IndexError) as exc:
            raise WeatherServiceError(
                "Open-Meteo returned invalid weather data."
            ) from exc

    @classmethod
    def _normalize(cls, payload):
        """Convert Open-Meteo's response into a frontend-friendly format."""

        current = payload["current"]
        daily = payload["daily"]

        forecast = []

        for i, date in enumerate(daily["time"]):
            forecast.append(
                {
                    "date": date,
                    "weather_code": daily["weather_code"][i],
                    "high_temperature_f": daily[
                        "temperature_2m_max"
                    ][i],
                    "low_temperature_f": daily[
                        "temperature_2m_min"
                    ][i],
                    "precipitation_probability_percent": daily[
                        "precipitation_probability_max"
                    ][i],
                    "precipitation_inches": daily[
                        "precipitation_sum"
                    ][i],
                    "uv_index_max": daily["uv_index_max"][i],
                }
            )

        return {
            "current": {
                "temperature_f": current["temperature_2m"],
                "feels_like_f": current["apparent_temperature"],
                "humidity_percent": current["relative_humidity_2m"],
                "weather_code": current["weather_code"],
                "wind_speed_mph": current["wind_speed_10m"],
                "pressure_hpa": current["surface_pressure"],
                "visibility_meters": current["visibility"],
                "uv_index": daily["uv_index_max"][0],
            },
            "forecast": forecast,
        }