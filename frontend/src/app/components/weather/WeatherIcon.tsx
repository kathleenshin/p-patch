import { CloudRain, Sun, Cloud, Zap } from "lucide-react";
import { C } from "../../theme";

export function WeatherIcon({ type, size = 18 }: { type: string; size?: number }) {
  if (type === "sun")   return <Sun   size={size} color="#E8960A" />;
  if (type === "rain")  return <CloudRain size={size} color={C.sky} />;
  if (type === "storm") return <Zap   size={size} color="#7C5CBF" />;
  return <Cloud size={size} color="#94A3B8" />;
}
