import { X, AlertTriangle } from "lucide-react";
import { C, mono, serif } from "../../theme";
import { PlantIcon } from "../PlantIcon";
import { plotColors, type PlotInfo } from "./types";

export function PlotDetailPanel({
  plot,
  colByState,
  onClose,
  onNavigate,
  hideOwnerNames = false,
}: {
  plot: PlotInfo;
  colByState: typeof plotColors;
  onClose: () => void;
  onNavigate: (plotId: number) => void;
  hideOwnerNames?: boolean;
}) {
  const col = colByState[plot.state];
  const isMine = plot.isMine;
  const isAvailable = !plot.isOccupied;
  const showOwner = !hideOwnerNames && Boolean(plot.owner);

  return (
    <div className="plot-map-detail">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            ...mono,
            fontSize: "0.68rem",
            fontWeight: 800,
            color: C.brownLight,
            textTransform: "uppercase",
          }}
        >
          Plot #{plot.plotNumber}
        </span>

        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: C.muted,
            display: "flex",
            padding: "0.125rem",
          }}
        >
          <X size={14} />
        </button>
      </div>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.3125rem",
          background: col.bg,
          borderRadius: "1.25rem",
          padding: "0.25rem 0.625rem",
          width: "fit-content",
          border: isMine
            ? `0.125rem solid ${C.gold}`
            : `0.0938rem solid ${col.border}`,
        }}
      >
        {plot.isOccupied && (
          <PlantIcon size={14} />
        )}

        {(plot.state === "help-active" || plot.state === "help-pending") && (
          <AlertTriangle
            size={12}
            color={col.text}
            strokeWidth={2.5}
          />
        )}

        <span
          style={{
            fontSize: "0.68rem",
            fontWeight: 800,
            color: col.text,
          }}
        >
          {col.label}
        </span>
      </div>

      {showOwner ? (
        <div>
          <div
            style={{
              fontSize: "0.62rem",
              color: C.muted,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              ...mono,
            }}
          >
            Steward
          </div>

          <div
            style={{
              fontWeight: 700,
              fontSize: "0.88rem",
              color: C.brown,
              marginTop: "0.125rem",
              ...serif,
            }}
          >
            {plot.owner}
          </div>

          {plot.since && (
            <div
              style={{
                fontSize: "0.68rem",
                color: C.muted,
                marginTop: "0.0625rem",
              }}
            >
              Steward since {plot.since}
            </div>
          )}
        </div>
      ) : isAvailable ? (
        <div
          style={{
            fontSize: "0.78rem",
            color: C.muted,
            lineHeight: 1.5,
          }}
        >
          This plot is unassigned and available.
        </div>
      ) : (
        <div
          style={{
            fontSize: "0.78rem",
            color: C.muted,
            lineHeight: 1.5,
          }}
        >
          {col.label}
        </div>
      )}

      <button
        onClick={() => onNavigate(plot.id)}
        style={{
          marginTop: "auto",
          padding: "0.5rem 0.625rem",
          background: isMine
            ? `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`
            : isAvailable
              ? `linear-gradient(135deg, ${C.terra}, ${C.terraDark})`
              : C.creamDark,
          color:
            isMine || isAvailable
              ? C.white
              : C.brownLight,
          border: "none",
          borderRadius: "0.6875rem",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: "0.75rem",
          fontFamily: "'Nunito', sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.3125rem",
        }}
      >
        {isMine
          ? "My Plot Details →"
          : isAvailable
            ? "Apply for Plot →"
            : "View Details →"}
      </button>
    </div>
  );
}