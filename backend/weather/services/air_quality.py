"""Retrieves current air quality from Open-Meteo."""

from .open_meteo_client import OpenMeteoClient, OpenMeteoError


class AirQualityServiceError(Exception):
    """Raised when air quality data cannot be retrieved."""


class AirQualityService:
    BASE_URL = (
        "https://air-quality-api.open-meteo.com/v1/air-quality"
    )

    @classmethod
    def get_current(cls, latitude, longitude):
        try:
            payload = OpenMeteoClient.get(
                cls.BASE_URL,
                {
                    "latitude": latitude,
                    "longitude": longitude,
                    "hourly": ["us_aqi"],
                    "forecast_days": 1,
                },
            )

            values = payload["hourly"]["us_aqi"]

            us_aqi = next(
                value
                for value in values
                if value is not None
            )

            us_aqi = int(round(us_aqi))

            return {
                "us_aqi": us_aqi,
                "label": cls._label_for(us_aqi),
            }

        except (
            OpenMeteoError,
            KeyError,
            TypeError,
            StopIteration,
        ) as exc:
            raise AirQualityServiceError(
                "Unable to retrieve valid air quality data."
            ) from exc

    @staticmethod
    def _label_for(us_aqi):
        if us_aqi <= 50:
            return "Good"
        if us_aqi <= 100:
            return "Moderate"
        if us_aqi <= 150:
            return "Unhealthy for Sensitive Groups"
        if us_aqi <= 200:
            return "Unhealthy"
        if us_aqi <= 300:
            return "Very Unhealthy"

        return "Hazardous"