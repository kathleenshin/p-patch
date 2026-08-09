import { C } from "../../theme";

export type PlotState =
  | "available"
  | "active"
  | "help-active"
  | "help-pending"
  | "help-done"
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
  "help-active": {
    bg: C.terra,
    border: C.terraDark,
    text: C.white,
    label: "Help Active",
  },
  "help-pending": {
    bg: C.amber,
    border: "#A87308",
    text: C.white,
    label: "Help Pending",
  },
  "help-done": {
    bg: C.sageLight,
    border: C.sage,
    text: C.sageDark,
    label: "Help Done",
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
  "help-active": "🟠",
  "help-pending": "🟡",
  "help-done": "🟢",
  mine: "",
};

export interface PlotInfo {
  id: number;
  plotNumber: string;
  state: PlotState;
  needsHelp: boolean;
  isMine: boolean;
  isOccupied: boolean;
  owner?: string;
  since?: string;
}

export type FilterKey = PlotState | "all" | "help-needed";