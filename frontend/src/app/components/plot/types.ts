import { C } from "../../theme";

export type PlotState =
  | "available"
  | "active"
  | "help-needed"
  | "mine";

export const plotColors: Record<
  PlotState,
  {
    bg: string;
    border: string;
    text: string;
    label: string;
  }
> = {
  available: {
    bg: "#EBEBEB",
    border: "#C0C0C0",
    text: "#777",
    label: "Free",
  },
  active: {
    bg: C.sage,
    border: C.sageDark,
    text: C.white,
    label: "Occupied",
  },
  "help-needed": {
    bg: C.terra,
    border: C.terraDark,
    text: C.white,
    label: "Needs Help",
  },
  mine: {
    bg: C.sage,
    border: C.gold,
    text: C.white,
    label: "My Plot",
  },
};

export const plotEmoji: Record<PlotState, string> = {
  available: "",
  active: "",
  "help-needed": "🟠",
  mine: "",
};

export interface PlotInfo {
  id: number;
  plotNumber: string;
  state: PlotState;
  needsHelp: boolean;
  owner?: string;
  since?: string;
}

export type FilterKey = PlotState | "all";