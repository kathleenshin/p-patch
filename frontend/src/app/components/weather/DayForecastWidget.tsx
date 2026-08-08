import { type ElementType } from "react";
import { Sun, Droplets, Wind, Gauge, Thermometer, Eye, ArrowRight } from "lucide-react";
import { C, mono } from "../../theme";
import { useWeather } from "../../hooks/useWeather";
import { WeatherIcon } from "./WeatherIcon";
import { weatherCodeToIconType } from "./weatherCode";

export function DayForecastWidget({ showWeekLink = false }: { showWeekLink?: boolean }) {
  const { weather, weatherLoading, weatherError } = useWeather();

  const current = weather?.current;

  const iconType = weatherCodeToIconType(current?.weather_code);

  const description = current?.weather_description ?? "Weather unavailable";

  const visibilityMiles =
    current == null
      ? null
      : Math.round((current.visibility_meters * 0.000621371) * 10) / 10;

  const stats: { Icon: ElementType; val: string; label: string }[] = [
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
      val: current ? `${Math.round(current.pressure_hpa)} mb` : "--",
      label: "Pressure",
    },
    {
      Icon: Thermometer,
      val: current ? `UV ${Math.round(current.uv_index)}` : "--",
      label: "UV Index",
    },
    {
      Icon: Eye,
      val: visibilityMiles == null ? "--" : `${visibilityMiles} mi`,
      label: "Visibility",
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
            Today
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
              {current ? `${Math.round(current.temperature_f)}°` : "--°"}
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
