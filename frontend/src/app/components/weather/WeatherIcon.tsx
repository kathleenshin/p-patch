import { CloudRain, Sun, Cloud, Zap } from "lucide-react";
import { C } from "../../theme";

export function WeatherIcon({ type, size = 18 }: { type: string; size?: number }) {
  const normalized = type.toLowerCase();

  if (normalized === "sun" || normalized.includes("clear")) {
    return <Sun size={size} color="#E8960A" />;
  }

  if (normalized === "storm" || normalized.includes("thunder") || normalized.includes("hail")) {
    return <Zap size={size} color="#7C5CBF" />;
  }

  if (
    normalized === "rain"
    || normalized.includes("rain")
    || normalized.includes("drizzle")
    || normalized.includes("sleet")
    || normalized.includes("snow")
  ) {
    return <CloudRain size={size} color={C.sky} />;
  }

  return <Cloud size={size} color="#94A3B8" />;
}
