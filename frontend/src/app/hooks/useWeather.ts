import { useEffect, useState } from "react";
import { fetchWeather, type WeatherResponse } from "@/api/weather";
import { useAuth } from "../auth/AuthContext";

export function useWeather(gardenId?: number | null) {
  const { accessToken } = useAuth();

  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadWeather() {
      if (!accessToken) {
        if (!cancelled) {
          setWeather(null);
          setWeatherError(null);
          setWeatherLoading(false);
        }
        return;
      }

      if (!gardenId) {
        if (!cancelled) {
          setWeather(null);
          setWeatherError("No garden is available for weather lookup.");
          setWeatherLoading(false);
        }
        return;
      }

      try {
        if (!cancelled) {
          setWeatherLoading(true);
          setWeatherError(null);
        }

        const data = await fetchWeather(accessToken, gardenId, controller.signal);

        if (!cancelled) {
          setWeather(data);
        }
      } catch (error) {
        const aborted = error instanceof DOMException && error.name === "AbortError";

        if (!cancelled && !aborted) {
          setWeather(null);
          setWeatherError(
            error instanceof Error ? error.message : "Unable to load weather.",
          );
        }
      } finally {
        if (!cancelled) {
          setWeatherLoading(false);
        }
      }
    }

    void loadWeather();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken, gardenId]);

  return {
    weather,
    weatherLoading,
    weatherError,
  };
}