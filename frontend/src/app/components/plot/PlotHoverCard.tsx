import { C, mono, serif } from "../../theme";
import { plotColors, type PlotInfo } from "./types";

export function PlotHoverCard({
  plot,
  x,
  y,
  hideOwnerNames = false,
}: {
  plot: PlotInfo;
  x: number;
  y: number;
  hideOwnerNames?: boolean;
}) {
  const col = plotColors[plot.state];
  // Occupied plots: show owner only when allowed for this viewer.
  const showOwner = !hideOwnerNames && Boolean(plot.owner);

  return (
    <div style={{ position: "fixed", left: x + 14, top: y - 10, zIndex: 100,
      background: C.white, border: `0.125rem solid ${col.border}`,
      borderRadius: "1rem", padding: "0.875rem 1rem", width: "min(70vw, 12.25rem)",
      boxShadow: "0 0.5rem 2rem rgba(44,31,20,0.18)", pointerEvents: "none" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <span style={{ ...mono, fontSize: "0.66rem", fontWeight: 700,
          color: plot.state === "available" ? C.brownLight : col.bg === C.white ? C.brownLight : col.bg,
          textTransform: "uppercase", letterSpacing: "0.06em" }}>Plot #{plot.id}</span>
        <span style={{ background: col.bg, color: col.text, fontSize: "0.6rem",
          fontWeight: 800, padding: "0.125rem 0.5rem", borderRadius: "1.25rem",
          border: `0.0625rem solid ${col.border}` }}>{col.label}</span>
      </div>
      {plot.state === "available" ? (
        <div style={{ color: C.muted, fontSize: "0.78rem" }}>No owner — available to apply</div>
      ) : plot.state === "pending" ? (
        <div style={{ color: C.lavender, fontSize: "0.78rem" }}>⏳ Awaiting admin approval</div>
      ) : (
        <>
          {showOwner ? (
            <div style={{ fontWeight: 700, fontSize: "0.86rem", color: C.brown,
              marginBottom: "0.1875rem", ...serif }}>{plot.owner}</div>
          ) : (
            <div style={{ fontWeight: 700, fontSize: "0.86rem", color: C.brown,
              marginBottom: "0.1875rem", ...serif }}>{col.label}</div>
          )}
          {!hideOwnerNames && plot.since && (
            <div style={{ fontSize: "0.7rem", color: C.muted, marginBottom: "0.375rem" }}>
              Member since {plot.since} · {plot.section}
            </div>
          )}
          {plot.crops && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
              {plot.crops.map((c) => (
                <span key={c} style={{ background: C.sagePop, color: C.sageDark,
                  fontSize: "0.66rem", padding: "0.125rem 0.5rem", borderRadius: "1.25rem", fontWeight: 700 }}>{c}</span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
