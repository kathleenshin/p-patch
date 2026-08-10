from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework_simplejwt.tokens import AccessToken

from plots.models import Garden


WEATHER_FORECAST_URL_NAME = "weather-forecast"
AUTH_TEST_EMAIL = "weather-test@example.com"
AUTH_TEST_PASSWORD = "password123"

OPEN_METEO_UNAVAILABLE_DETAIL = "Unable to retrieve weather data."
AIR_QUALITY_UNAVAILABLE_DETAIL = (
    "Unable to retrieve valid air quality data."
)


class WeatherTestFixtures(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.garden_with_coordinates = Garden.objects.create(
            name="Judkins Park P-Patch",
            latitude=47.6062,
            longitude=-122.3321,
        )

        cls.garden_without_coordinates = Garden.objects.create(
            name="No Coordinates Garden",
        )

    @staticmethod
    def weather_url():
        return reverse(WEATHER_FORECAST_URL_NAME)

    @staticmethod
    def weather_cache_key(garden):
        return f"weather_forecast_garden_{garden.id}"

    @staticmethod
    def auth_headers_for_user(user):
        token = str(AccessToken.for_user(user))
        return {
            "HTTP_AUTHORIZATION": f"Bearer {token}",
        }

    @staticmethod
    def create_auth_user():
        return get_user_model().objects.create_user(
            email=AUTH_TEST_EMAIL,
            password=AUTH_TEST_PASSWORD,
        )

    def weather_get(self, client, garden_id=None):
        params = {}

        if garden_id is not None:
            params["garden_id"] = garden_id

        return client.get(
            self.weather_url(),
            params,
        )

    @staticmethod
    def sample_raw_weather_payload():
        return {
            "current": {
                "temperature_2m": 70.0,
                "apparent_temperature": 69.0,
                "relative_humidity_2m": 55,
                "weather_code": 1,
                "is_day": 1,
                "wind_speed_10m": 5.0,
            },
            "daily": {
                "time": [
                    "2026-08-08",
                    "2026-08-09",
                ],
                "weather_code": [1, 2],
                "temperature_2m_max": [75.0, 74.0],
                "temperature_2m_min": [56.0, 55.0],
                "precipitation_probability_max": [10, 20],
                "precipitation_sum": [0.0, 0.1],
                "uv_index_max": [5.4, 4.7],
            },
        }

    @staticmethod
    def sample_normalized_weather_payload():
        return {
            "current": {
                "temperature_f": 70.0,
                "feels_like_f": 69.0,
                "humidity_percent": 55,
                "weather_code": 1,
                "weather_description": "Mainly Sunny",
                "wind_speed_mph": 5.0,
                "uv_index": 5.4,
                "precipitation_probability_percent": 10,
                "precipitation_inches": 0.0,
            },
            "forecast": [
                {
                    "date": "2026-08-08",
                    "weather_code": 1,
                    "weather_description": "Mainly Sunny",
                    "high_temperature_f": 75.0,
                    "low_temperature_f": 56.0,
                    "precipitation_probability_percent": 10,
                    "precipitation_inches": 0.0,
                    "uv_index_max": 5.4,
                },
                {
                    "date": "2026-08-09",
                    "weather_code": 2,
                    "weather_description": "Partly Cloudy",
                    "high_temperature_f": 74.0,
                    "low_temperature_f": 55.0,
                    "precipitation_probability_percent": 20,
                    "precipitation_inches": 0.1,
                    "uv_index_max": 4.7,
                },
            ],
        }

    @staticmethod
    def sample_air_quality_raw_payload():
        return {
            "hourly": {
                "time": [
                    "2026-08-08T00:00",
                    "2026-08-08T01:00",
                    "2026-08-08T02:00",
                    "2026-08-09T00:00",
                    "2026-08-09T01:00",
                    "2026-08-09T02:00",
                ],
                "us_aqi": [
                    42,
                    55,
                    61,
                    70,
                    80,
                    90,
                ],
            }
        }

    @staticmethod
    def sample_air_quality_payload():
        return {
            "current": {
                "us_aqi": 42,
                "label": "Good",
            },
            "forecast": [
                {
                    "date": "2026-08-08",
                    "us_aqi_average": 53,
                    "label": "Moderate",
                },
                {
                    "date": "2026-08-09",
                    "us_aqi_average": 80,
                    "label": "Moderate",
                },
            ],
        }

    def sample_view_payload(self):
        return {
            **self.sample_normalized_weather_payload(),
            "air_quality": self.sample_air_quality_payload(),
        }