import type { CSSProperties } from "react";

export const serif = { fontFamily: "'Lora', serif" };
export const sans  = { fontFamily: "'Nunito', sans-serif" };
export const mono  = { fontFamily: "'DM Mono', monospace" };

export const C = {
  cream:      "#FAF8F3",
  creamDark:  "#EDE8DC",
  card:       "#FFFFFF",
  sage:       "#3F7D47",
  sageDark:   "#2D5C33",
  sageLight:  "#D2ECD8",
  sagePop:    "#E8F5EB",
  sageMid:    "#B4D8BC",
  header:     "#2F4633",
  terra:      "#C76A32",
  terraDark:  "#9E5025",
  terraLight: "#FAE8DA",
  amber:      "#D4920A",
  amberLight: "#FEF3D0",
  gold:       "#C8A020",
  lavender:   "#7C5CBF",
  sky:        "#1D90D0",
  brown:      "#2B2B2B",
  brownMid:   "#4A4A4A",
  brownLight: "#6A6A6A",
  muted:      "#9A9A8A",
  border:     "#DED8CC",
  white:      "#FFFFFF",
};

export const inputStyle: CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "0.6875rem 0.875rem",
  border: `0.0938rem solid ${C.border}`, borderRadius: "0.75rem", fontSize: "0.9rem",
  background: C.cream, color: C.brown, outline: "none",
  fontFamily: "'Nunito', sans-serif",
};
export const linkStyle: CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  color: C.brownLight, fontFamily: "'Nunito', sans-serif", fontSize: "0.82rem",
};
export const labelStyle: CSSProperties = {
  fontSize: "0.7rem", fontWeight: 800, color: C.brownLight,
  letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: "0.375rem",
};
export const cardStyle: CSSProperties = {
  background: C.card, border: `0.0625rem solid ${C.border}`, borderRadius: "1.25rem", padding: "1.25rem",
};
