import { apiFetch } from "@/lib/api";

export interface WeatherCurrent {
  temperature_f: number;
  feels_like_f: number;
  humidity_percent: number;
  weather_code: number;
  weather_description: string;
  wind_speed_mph: number;
  uv_index: number;
  precipitation_probability_percent: number;
  precipitation_inches: number;
}

export interface WeatherAirQuality {
  current: {
    us_aqi: number | null;
    label: string;
  };
  forecast: Array<{
    date: string;
    us_aqi_average: number;
    label: string;
  }>;
}

export interface WeatherForecastDay {
  date: string;
  weather_code: number;
  weather_description: string;
  high_temperature_f: number;
  low_temperature_f: number;
  precipitation_probability_percent: number;
  precipitation_inches: number;
  uv_index_max: number;
}

export interface WeatherResponse {
  current: WeatherCurrent;
  forecast: WeatherForecastDay[];
  air_quality: WeatherAirQuality;
}

export async function fetchWeather(
  token: string | null,
  gardenId: number,
  signal?: AbortSignal,
): Promise<WeatherResponse> {
  return apiFetch<WeatherResponse>(`/api/weather/?garden_id=${gardenId}`, {
    token,
    signal,
  });
}