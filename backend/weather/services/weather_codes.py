"""Translate Open-Meteo weather codes using local weather data."""

import json
from pathlib import Path


DESCRIPTIONS_PATH = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "weather_descriptions.json"
)

_descriptions_cache = None


def _description_map():
    global _descriptions_cache

    if _descriptions_cache is None:
        with DESCRIPTIONS_PATH.open(
            "r",
            encoding="utf-8",
        ) as handle:
            _descriptions_cache = json.load(handle)

    return _descriptions_cache


def description_for(weather_code, *, is_day=True):
    code_map = _description_map().get(str(weather_code))

    if not isinstance(code_map, dict):
        return "Mixed"

    period = "day" if is_day else "night"

    return (
        code_map.get(period)
        or code_map.get("day")
        or "Mixed"
    )