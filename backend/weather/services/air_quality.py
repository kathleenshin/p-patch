"""Retrieves current and forecast air quality from Open-Meteo."""

from collections import defaultdict
from datetime import datetime
from zoneinfo import ZoneInfo

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

            times = payload["hourly"]["time"]
            values = payload["hourly"]["us_aqi"]

            current_hour = datetime.now(
                ZoneInfo("America/Los_Angeles")
            ).strftime("%Y-%m-%dT%H:00")

            try:
                index = times.index(current_hour)
                us_aqi = values[index]
            except ValueError:
                us_aqi = None

            if us_aqi is None:
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

    @classmethod
    def get_daily_forecast(cls, latitude, longitude):
        try:
            payload = OpenMeteoClient.get(
                cls.BASE_URL,
                {
                    "latitude": latitude,
                    "longitude": longitude,
                    "hourly": ["us_aqi"],
                    "forecast_days": 7,
                },
            )

            times = payload["hourly"]["time"]
            values = payload["hourly"]["us_aqi"]

            values_by_date = defaultdict(list)

            for timestamp, us_aqi in zip(times, values):
                if us_aqi is not None:
                    date = timestamp.split("T")[0]
                    values_by_date[date].append(us_aqi)

            forecast = []

            for date, daily_values in values_by_date.items():
                average = int(
                    round(sum(daily_values) / len(daily_values))
                )

                forecast.append(
                    {
                        "date": date,
                        "us_aqi_average": average,
                        "label": cls._label_for(average),
                    }
                )

            return forecast

        except (
            OpenMeteoError,
            KeyError,
            TypeError,
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