import { C } from "../theme";

export function DoodleLeaf({ size = 28, color = C.sage }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M8 26 C8 26 10 14 20 8 C28 4 28 4 28 4 C28 4 26 14 18 20 C12 24 8 26 8 26Z"
        fill={color} opacity="0.95" />
      <path d="M8 26 L18 16" stroke={color === C.white ? "rgba(255,255,255,0.4)" : C.sageDark}
        strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
