import { type ElementType } from "react";
import { Sun, Droplets, Wind, Gauge, Thermometer, Eye, ArrowRight } from "lucide-react";
import { C, mono } from "../../theme";
import { weekWeather, todayDetail } from "./weatherData";
import { WeatherIcon } from "./WeatherIcon";

export function DayForecastWidget({ showWeekLink = false }: { showWeekLink?: boolean }) {
  const today = weekWeather[0];
  const d     = todayDetail;

  const stats: { Icon: ElementType; val: string; label: string }[] = [
    { Icon: Droplets,    val: `${d.humidity}%`,    label: "Humidity" },
    { Icon: Wind,        val: `${d.wind} mph`,      label: "Wind" },
    { Icon: Gauge,       val: `${d.pressure} mb`,   label: "Pressure" },
    { Icon: Thermometer, val: `UV ${d.uvIndex}`,    label: "UV Index" },
    { Icon: Eye,         val: `${d.visibility} mi`, label: "Visibility" },
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
              color: C.brown, lineHeight: 1 }}>{today.hi}°</span>
            <span style={{ fontSize: "0.65rem", color: C.brownLight,
              display: "block", marginTop: "0.125rem" }}>{today.desc}</span>
          </div>
          <WeatherIcon type={today.icon} size={54} />
        </div>
        <div style={{ fontSize: "0.65rem", color: C.muted, marginBottom: "0.75rem" }}>
          Feels like {d.feelsLike}°F
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
