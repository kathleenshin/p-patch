import { type ElementType } from "react";
import { Sun, Droplets, Wind, Gauge, Thermometer, Leaf, ArrowRight } from "lucide-react";
import { C, mono } from "../../theme";
import type { WeatherResponse } from "@/api/weather";
import { WeatherIcon } from "./WeatherIcon";
import { weatherCodeToIconType } from "./weatherCode";

type DayForecastWidgetProps = {
  weather: WeatherResponse | null;
  weatherLoading: boolean;
  weatherError: string | null;
  selectedDate?: string | null;
  showWeekLink?: boolean;
};

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function headerLabel(selectedDate?: string | null) {
  const toUpperDay = (dateKey: string) => {
    const parsed = new Date(`${dateKey}T12:00:00`);
    return parsed.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase();
  };

  if (!selectedDate) {
    return "TODAY";
  }

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (selectedDate === formatDateKey(today)) {
    return "TODAY";
  }

  if (selectedDate === formatDateKey(tomorrow)) {
    return `TOMORROW, ${toUpperDay(selectedDate)}`;
  }

  return toUpperDay(selectedDate);
}

export function DayForecastWidget({
  weather,
  weatherLoading,
  weatherError,
  selectedDate,
  showWeekLink = false,
}: DayForecastWidgetProps) {

  const selectedForecast =
    selectedDate == null
      ? null
      : weather?.forecast.find((day) => day.date === selectedDate) ?? null;

  const current = weather?.current;
  const usingSelectedForecast = selectedForecast != null;

  const iconType = weatherCodeToIconType(
    selectedForecast?.weather_code ?? current?.weather_code,
  );

  const description =
    selectedForecast?.weather_description
    ?? current?.weather_description
    ?? "Weather unavailable";

  const stats: { Icon: ElementType; val: string; label: string }[] =
    usingSelectedForecast
      ? [
          {
            Icon: Droplets,
            val: current ? `${Math.round(current.humidity_percent)}%` : "--",
            label: "Humidity",
          },
          {
            Icon: Wind,
            val: current ? `${Math.round(current.wind_speed_mph)} mph` : "--",
            label: "Wind",
          },
          {
            Icon: Gauge,
            val: `${Math.round(selectedForecast.precipitation_probability_percent)}%`,
            label: "Chance of Rain",
          },
          {
            Icon: Thermometer,
            val: `UV ${Math.round(selectedForecast.uv_index_max)}`,
            label: "UV Index",
          },
          {
            Icon: Leaf,
            val: weather?.air_quality.us_aqi == null
              ? weather?.air_quality.label ?? "Unavailable"
              : `${weather.air_quality.us_aqi} ${weather.air_quality.label}`,
            label: "Air Quality",
          },
        ]
      : [
          {
            Icon: Droplets,
            val: current ? `${Math.round(current.humidity_percent)}%` : "--",
            label: "Humidity",
          },
          {
            Icon: Wind,
            val: current ? `${Math.round(current.wind_speed_mph)} mph` : "--",
            label: "Wind",
          },
          {
            Icon: Gauge,
            val: current
              ? `${Math.round(current.precipitation_probability_percent)}%`
              : "--",
            label: "Chance of Rain",
          },
          {
            Icon: Thermometer,
            val: current ? `UV ${Math.round(current.uv_index)}` : "--",
            label: "UV Index",
          },
          {
            Icon: Leaf,
            val: weather?.air_quality.us_aqi == null
              ? weather?.air_quality.label ?? "Unavailable"
              : `${weather.air_quality.us_aqi} ${weather.air_quality.label}`,
            label: "Air Quality",
          },
        ];

  return (
    <div style={{ background: C.card, border: `0.0625rem solid ${C.border}`,
      borderRadius: "0.875rem", overflow: "hidden",
      boxShadow: "0 0.0625rem 0.375rem rgba(44,31,20,0.07)" }}>
      {/* Green header strip */}
      <div style={{ background: C.sagePop, borderBottom: `0.0625rem solid ${C.sageMid}`,
        padding: "0.5rem 0.875rem", display: "flex", alignItems: "center",
        justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
          <Sun size={13} color={C.sage} />
          <span style={{ fontSize: "0.68rem", fontWeight: 800, color: C.sage,
            textTransform: "uppercase", letterSpacing: "0.06em", ...mono }}>
            {headerLabel(selectedDate)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "0.75rem 0.875rem", display: "flex", flexDirection: "column", gap: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: "0.75rem", marginBottom: "0.25rem" }}>
          <div>
            <span style={{ fontSize: "2rem", fontWeight: 800,
              color: C.brown, lineHeight: 1 }}>
              {selectedForecast
                ? `${Math.round(selectedForecast.high_temperature_f)}°`
                : current
                  ? `${Math.round(current.temperature_f)}°`
                  : "--°"}
            </span>
            <span style={{ fontSize: "0.65rem", color: C.brownLight,
              display: "block", marginTop: "0.125rem" }}>
              {weatherLoading ? "Loading weather..." : description}
            </span>
          </div>
          <WeatherIcon type={iconType} size={54} />
        </div>
        <div style={{ fontSize: "0.65rem", color: C.muted, marginBottom: "0.75rem" }}>
          {weatherError
            ? weatherError
            : selectedForecast
              ? `Low ${Math.round(selectedForecast.low_temperature_f)}°F`
              : current
                ? `Feels like ${Math.round(current.feels_like_f)}°F`
              : "Weather unavailable"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          {stats.map(({ Icon, val, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center",
              justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.3125rem" }}>
                <Icon size={11} color={C.muted} />
                <span style={{ fontSize: "0.64rem", color: C.muted }}>{label}</span>
              </div>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: C.brownMid }}>{val}</span>
            </div>
          ))}
        </div>
        {showWeekLink && (
          <div style={{ borderTop: `0.0625rem solid ${C.border}`, paddingTop: "0.75rem", marginTop: "0.75rem" }}>
            <button style={{ background: "none", border: "none", padding: 0,
              cursor: "pointer", fontFamily: "'Nunito', sans-serif",
              display: "flex", alignItems: "center", gap: "0.25rem",
              fontSize: "0.72rem", fontWeight: 700, color: C.sage }}>
              Weekly forecast <ArrowRight size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
