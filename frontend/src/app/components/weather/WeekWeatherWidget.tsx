import { Cloud } from "lucide-react";
import { C, mono } from "../../theme";
import type { WeatherResponse } from "@/api/weather";
import { WeatherIcon } from "./WeatherIcon";
import { weatherCodeToIconType } from "./weatherCode";

type WeekWeatherWidgetProps = {
  weather: WeatherResponse | null;
  weatherLoading: boolean;
  weatherError: string | null;
  selectedDate?: string | null;
  onSelectDate?: (date: string) => void;
};

export function WeekWeatherWidget({
  weather,
  weatherLoading,
  weatherError,
  selectedDate,
  onSelectDate,
}: WeekWeatherWidgetProps) {

  const weekForecast = weather?.forecast ?? [];

  const dayLabel = (date: string) => {
    const parsed = new Date(`${date}T12:00:00`);
    return parsed.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3).toUpperCase();
  };

  const activeDate = selectedDate ?? weekForecast[0]?.date ?? null;

  return (
    <div style={{ background: C.card, border: `0.0625rem solid ${C.border}`, borderRadius: "0.875rem", overflow: "hidden" }}>
      <div style={{ background: C.sagePop, borderBottom: `0.0625rem solid ${C.sageMid}`,
        padding: "0.5rem 0.875rem", display: "flex", alignItems: "center", gap: "0.375rem" }}>
        <Cloud size={13} color={C.sage} />
        <span style={{ fontSize: "0.68rem", fontWeight: 800, color: C.sage,
          textTransform: "uppercase", letterSpacing: "0.06em", ...mono }}>
          Week Forecast
        </span>
      </div>

      {weatherLoading ? (
        <div style={{ fontSize: "0.72rem", color: C.muted, padding: "0.75rem 0.875rem" }}>
          Loading forecast...
        </div>
      ) : weatherError ? (
        <div style={{ fontSize: "0.72rem", color: C.terra, padding: "0.75rem 0.875rem" }}>
          {weatherError}
        </div>
      ) : weekForecast.length === 0 ? (
        <div style={{ fontSize: "0.72rem", color: C.muted, padding: "0.75rem 0.875rem" }}>
          No weekly forecast available.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${weekForecast.length}, 1fr)`,
          padding: "0.5rem 0.5rem 0.625rem" }}>
          {weekForecast.map((d) => (
            <button
              key={d.date}
              onClick={() => onSelectDate?.(d.date)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.1875rem",
                padding: "0.25rem 0.125rem",
                background: d.date === activeDate ? C.sagePop : "transparent",
                borderRadius: "0.5rem",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: "0.58rem", color: d.date === activeDate ? C.sage : C.muted,
                fontWeight: 800, ...mono }}>{dayLabel(d.date)}</span>
              <WeatherIcon type={weatherCodeToIconType(d.weather_code)} size={14} />
              <span style={{ fontSize: "0.68rem", fontWeight: 800, color: C.brown }}>
                {Math.round(d.high_temperature_f)}°
              </span>
              <span style={{ fontSize: "0.56rem", color: C.muted }}>
                {Math.round(d.low_temperature_f)}°
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
