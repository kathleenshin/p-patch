import { Cloud } from "lucide-react";
import { C, mono } from "../../theme";
import { weekWeather } from "./weatherData";
import { WeatherIcon } from "./WeatherIcon";

export function WeekWeatherWidget() {
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
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${weekWeather.length}, 1fr)`,
        padding: "0.5rem 0.5rem 0.625rem" }}>
        {weekWeather.map((d, i) => (
          <div key={d.day} style={{ display: "flex", flexDirection: "column",
            alignItems: "center", gap: "0.1875rem", padding: "0.25rem 0.125rem",
            background: i === 0 ? C.sagePop : "transparent",
            borderRadius: "0.5rem" }}>
            <span style={{ fontSize: "0.58rem", color: i === 0 ? C.sage : C.muted,
              fontWeight: 800, ...mono }}>{d.day}</span>
            <WeatherIcon type={d.icon} size={14} />
            <span style={{ fontSize: "0.68rem", fontWeight: 800, color: C.brown }}>{d.hi}°</span>
            <span style={{ fontSize: "0.56rem", color: C.muted }}>{d.lo}°</span>
          </div>
        ))}
      </div>
    </div>
  );
}
