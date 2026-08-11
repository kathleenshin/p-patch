import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PlotGrid } from "../src/app/components/plot/PlotGrid";
import type { PlotInfo } from "../src/app/components/plot/types";

vi.mock("../src/app/components/plot/PlotCell", () => ({
  PlotCell: ({ plot }: { plot: PlotInfo }) => (
    <div data-testid="plot-cell">{plot.plotNumber}</div>
  ),
}));

function samplePlot(overrides: Partial<PlotInfo> = {}): PlotInfo {
  return {
    id: 1,
    plotNumber: "A1",
    state: "active",
    needsHelp: false,
    isMine: false,
    isOccupied: true,
    owner: "Ada",
    since: "2026-01-01",
    ...overrides,
  };
}

describe("PlotGrid", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps mine plots in the Occupied filter", async () => {
    const user = userEvent.setup();
    const plots = [
      samplePlot({ id: 1, plotNumber: "A1", state: "mine", isMine: true }),
      samplePlot({ id: 2, plotNumber: "B2", owner: "Bea" }),
      samplePlot({
        id: 3,
        plotNumber: "C3",
        state: "available",
        isOccupied: false,
        owner: undefined,
        since: undefined,
      }),
    ];

    render(<PlotGrid plots={plots} onNavigate={() => undefined} />);

    expect(screen.getAllByTestId("plot-cell")).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: /Occupied/i }));

    expect(screen.getAllByTestId("plot-cell").map((cell) => cell.textContent)).toEqual([
      "A1",
      "B2",
    ]);
  });
});