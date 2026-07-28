import { X, AlertTriangle } from "lucide-react";
import { C, mono, serif } from "../../theme";
import { PlantIcon } from "../PlantIcon";
import { plotColors, type PlotInfo } from "./types";

export function PlotDetailPanel({ plot, colByState, onClose, onNavigate }: {
  plot: PlotInfo;
  colByState: typeof plotColors;
  onClose: () => void;
  onNavigate: () => void;
}) {
  const col    = colByState[plot.state];
  const isMine = plot.state === "mine";
  return (
    <div className="plot-map-detail">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ ...mono, fontSize: "0.68rem", fontWeight: 800,
          color: C.brownLight, textTransform: "uppercase" }}>
          Plot #{plot.id}
        </span>
        <button onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer",
            color: C.muted, display: "flex", padding: "0.125rem" }}>
          <X size={14} />
        </button>
      </div>

      <div style={{ display: "inline-flex", alignItems: "center", gap: "0.3125rem",
        background: col.bg, borderRadius: "1.25rem", padding: "0.25rem 0.625rem", width: "fit-content",
        border: isMine ? `0.125rem solid ${C.gold}` : `0.0938rem solid ${col.border}` }}>
        {(plot.state === "active" || plot.state === "mine") && <PlantIcon size={14} />}
        {plot.state === "help-needed" && (
          <AlertTriangle size={12} color={col.text} strokeWidth={2.5} />
        )}
        <span style={{ fontSize: "0.68rem", fontWeight: 800, color: col.text }}>
          {col.label}
        </span>
      </div>

      {plot.owner ? (
        <>
          <div>
            <div style={{ fontSize: "0.62rem", color: C.muted,
              textTransform: "uppercase", letterSpacing: "0.05em", ...mono }}>Owner</div>
            <div style={{ fontWeight: 700, fontSize: "0.88rem",
              color: C.brown, marginTop: "0.125rem", ...serif }}>{plot.owner}</div>
            {plot.since && (
              <div style={{ fontSize: "0.68rem", color: C.muted, marginTop: "0.0625rem" }}>
                Member since {plot.since}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: "0.62rem", color: C.muted,
              textTransform: "uppercase", letterSpacing: "0.05em", ...mono }}>Zone</div>
            <div style={{ fontSize: "0.78rem", color: C.brownMid, marginTop: "0.125rem" }}>
              {plot.section}
            </div>
          </div>
          {plot.crops && plot.crops.length > 0 && (
            <div>
              <div style={{ fontSize: "0.62rem", color: C.muted,
                textTransform: "uppercase", letterSpacing: "0.05em", ...mono,
                marginBottom: "0.3125rem" }}>Growing</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                {plot.crops.map(c => (
                  <span key={c} style={{ background: C.sagePop, color: C.sageDark,
                    fontSize: "0.64rem", padding: "0.125rem 0.5rem", borderRadius: "1.25rem",
                    fontWeight: 700 }}>{c}</span>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: "0.78rem", color: C.muted, lineHeight: 1.5 }}>
          This plot is unassigned and free to apply for.
        </div>
      )}

      <button onClick={onNavigate}
        style={{ marginTop: "auto", padding: "0.5rem 0.625rem",
          background: isMine
            ? `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`
            : plot.state === "available"
            ? `linear-gradient(135deg, ${C.terra}, ${C.terraDark})`
            : C.creamDark,
          color: (isMine || plot.state === "available") ? C.white : C.brownLight,
          border: "none", borderRadius: "0.6875rem", cursor: "pointer", fontWeight: 700,
          fontSize: "0.75rem", fontFamily: "'Nunito', sans-serif",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3125rem" }}>
        {isMine ? "My Plot Details →"
          : plot.state === "available" ? "Apply for Plot →"
          : "View Details →"}
      </button>
    </div>
  );
}
