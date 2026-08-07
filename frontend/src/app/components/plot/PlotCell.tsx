import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { C, mono } from "../../theme";
import { PlantIcon } from "../PlantIcon";
import { plotColors, type PlotInfo } from "./types";
import { PlotHoverCard } from "./PlotHoverCard";

export function PlotCell({
  plot,
  onClick,
  selected = false,
  hideOwnerNames = false,
}: {
  plot: PlotInfo;
  onClick: () => void;
  selected?: boolean;
  hideOwnerNames?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const col = plotColors[plot.state];
  const isMine = plot.state === "mine";

  const isEmptyState = plot.state === "available";

  return (
    <>
      <div
        onClick={onClick}
        onMouseEnter={(e) => {
          setHovered(true);
          setPos({ x: e.clientX, y: e.clientY });
        }}
        onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: col.bg,
          border: selected
            ? `0.1875rem solid ${C.amber}`
            : isMine
              ? `0.1875rem solid ${C.gold}`
              : `0.125rem solid ${col.border}`,
          borderRadius: "0.8125rem",
          padding: "0.5rem 0.5rem 0.375rem",
          cursor: "pointer",
          position: "relative",
          filter: hovered && !selected ? "brightness(1.18)" : "none",
          transform: hovered && !selected
            ? "translateY(-0.125rem) scale(1.02)"
            : "none",
          boxShadow: selected
            ? `0 0 0 0.1875rem ${C.amber}55, 0 0.25rem 1rem ${C.amber}33`
            : isMine
              ? `0 0 0 0.0625rem ${C.gold}44, 0 0.25rem 0.875rem ${C.gold}33`
              : hovered
                ? `0 0.3125rem 1.125rem ${col.border}80`
                : "0 0.0625rem 0.1875rem rgba(0,0,0,0.05)",
          minHeight: "4.5rem",
          transition:
            "transform 0.12s, box-shadow 0.12s, border-color 0.12s",
        }}
      >
        {/* Plot number */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.25rem",
          }}
        >
          <span
            style={{
              fontSize: "0.58rem",
              fontWeight: 800,
              letterSpacing: "0.05em",
              color: isEmptyState ? "#888" : col.text,
              ...mono,
            }}
          >
            #{plot.plotNumber}
          </span>

          {isMine && (
            <span
              style={{
                fontSize: "0.75rem",
                lineHeight: 1,
                color: "#FFE033",
                filter:
                  "drop-shadow(0 0.0625rem 0.125rem rgba(0,0,0,0.4))",
              }}
            >
              ★
            </span>
          )}
        </div>

        {/* Icon */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "2.5rem",
          }}
        >
          {(plot.state === "active" || plot.state === "mine") && (
            <PlantIcon size={36} />
          )}

          {plot.needsHelp && (
            <AlertTriangle
              size={26}
              color="#FFFFFF"
              strokeWidth={2}
            />
          )}

          {isEmptyState && (
            <div
              style={{
                width: "0.625rem",
                height: "0.625rem",
                borderRadius: "50%",
                background: "#C8C8C8",
                opacity: 0.6,
              }}
            />
          )}
        </div>

        {/* Owner name or status */}
        <div
          style={{
            textAlign: "center",
            fontSize: "0.58rem",
            marginTop: "0.1875rem",
            fontWeight: 700,
            color: isEmptyState
              ? C.muted
              : `${col.text}CC`,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {!hideOwnerNames &&
          plot.owner &&
          !isEmptyState
            ? plot.owner
            : col.label}
        </div>
      </div>

      {hovered && (
        <PlotHoverCard
          plot={plot}
          x={pos.x}
          y={pos.y}
          hideOwnerNames={hideOwnerNames}
        />
      )}
    </>
  );
}