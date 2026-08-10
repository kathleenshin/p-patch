"""Shared HTTP client for Open-Meteo APIs."""

import logging

import requests


logger = logging.getLogger(__name__)


class OpenMeteoError(Exception):
    """Raised when Open-Meteo data cannot be retrieved."""


class OpenMeteoClient:
    TIMEZONE = "America/Los_Angeles"
    TIMEOUT = 10

    @classmethod
    def get(cls, url, params):
        try:
            response = requests.get(
                url,
                params={
                    **params,
                    "timezone": cls.TIMEZONE,
                },
                timeout=cls.TIMEOUT,
            )

            response.raise_for_status()
            return response.json()

        except requests.RequestException as exc:
            logger.exception(
                "Open-Meteo request failed: %s",
                exc,
            )

            raise OpenMeteoError(
                "Unable to retrieve data from Open-Meteo."
            ) from exc