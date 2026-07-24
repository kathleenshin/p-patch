import requests


class OpenMeteoService:
    BASE_URL = "https://api.open-meteo.com/v1/forecast"

    def get_forecast(self):
        params = {
            # Currently set to Seattle downtown
            "latitude": 47.6062,
            "longitude": -122.3321,
            "current": [
                "temperature_2m",
                "weather_code",
            ],
            "daily": [
                "temperature_2m_max",
                "temperature_2m_min",
                "precipitation_probability_max",
            ],
            "temperature_unit": "fahrenheit",
            "timezone": "America/Los_Angeles",
            "forecast_days": 7,
        }

        response = requests.get(
            self.BASE_URL,
            params=params,
            timeout=10,
        )

        response.raise_for_status()

        return response.json()