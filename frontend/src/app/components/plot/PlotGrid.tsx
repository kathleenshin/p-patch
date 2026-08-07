import { useState } from "react";
import { C } from "../../theme";
import { plotColors, type FilterKey, type PlotInfo } from "./types";
import { PlotCell } from "./PlotCell";
import { PlotDetailPanel } from "./PlotDetailPanel";

export function PlotGrid({
  plots,
  onNavigate,
  hideOwnerNames = false,
}: {
  plots: PlotInfo[];
  onNavigate: (plotId: number) => void;
  hideOwnerNames?: boolean;
}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const filterDefs: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "available", label: "Free" },
    { key: "active", label: "Occupied" },
    { key: "help-needed", label: "Needs Help" },
    { key: "mine", label: "My Plot" },
  ];

  const visible =
    filter === "all"
      ? plots
      : plots.filter((plot) => plot.state === filter);

  const selected =
    plots.find((plot) => plot.id === selectedId) ?? null;

  const colByState = plotColors;

  const handleClick = (id: number) =>
    setSelectedId((prev) => (prev === id ? null : id));

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "0.375rem",
          marginBottom: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        {filterDefs.map(({ key, label }) => {
          const count =
            key === "all"
              ? plots.length
              : plots.filter((plot) => plot.state === key).length;

          const active = filter === key;

          return (
            <button
              key={key}
              onClick={() => {
                setFilter(key);
                setSelectedId(null);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.3125rem 0.75rem",
                borderRadius: "1.25rem",
                border: "none",
                cursor: "pointer",
                fontFamily: "'Nunito', sans-serif",
                fontSize: "0.75rem",
                fontWeight: 700,
                background: active ? C.sage : C.creamDark,
                color: active ? C.white : C.brownLight,
                transition: "all 0.15s",
              }}
            >
              {label}

              <span
                style={{
                  background: active
                    ? "rgba(255,255,255,0.22)"
                    : C.border,
                  color: active ? C.white : C.muted,
                  fontSize: "0.65rem",
                  borderRadius: "0.625rem",
                  padding: "0.0625rem 0.4375rem",
                  fontWeight: 800,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className="plot-map-layout"
        style={{
          background: C.card,
          border: `0.0625rem solid ${C.border}`,
          borderRadius: "1.125rem",
          padding: "1rem",
        }}
      >
        <div className="plot-map-grid">
          <div className="plot-map-cells">
            {visible.map((plot) => (
              <PlotCell
                key={plot.id}
                plot={plot}
                selected={selectedId === plot.id}
                hideOwnerNames={hideOwnerNames}
                onClick={() => handleClick(plot.id)}
              />
            ))}
          </div>

          <div
            style={{
              fontSize: "0.68rem",
              color: C.muted,
              marginTop: "0.25rem",
            }}
          >
            {visible.length} of {plots.length} plots shown
            {selectedId
              ? " · click a plot again to deselect"
              : " · click any plot for details"}
          </div>
        </div>

        {selected && (
          <PlotDetailPanel
            plot={selected}
            colByState={colByState}
            hideOwnerNames={hideOwnerNames}
            onClose={() => setSelectedId(null)}
            onNavigate={onNavigate}
          />
        )}
      </div>
    </div>
  );
}