import type { PlotInfo } from "./types";

export const allPlots: PlotInfo[] = [
  { id:  1, state: "active",       owner: "James L.",  since: "2019", crops: ["Kale","Garlic"],          section: "North" },
  { id:  2, state: "available",    section: "North" },
  { id:  3, state: "available",    section: "North" },
  { id:  4, state: "active",       owner: "Sofia M.",  since: "2021", crops: ["Squash","Basil"],          section: "North" },
  { id:  5, state: "help-needed",  owner: "Theo R.",   since: "2020", crops: ["Tomatoes","Cucumbers"],    section: "North" },
  { id:  6, state: "available",    section: "North" },
  { id:  7, state: "active",       owner: "Amara O.",  since: "2018", crops: ["Chard","Onions"],          section: "North" },
  { id:  8, state: "available",    section: "South" },
  { id:  9, state: "pending",      owner: "New Member (Pending)",      section: "South" },
  { id: 10, state: "active",       owner: "Luis M.",   since: "2022", crops: ["Peppers","Eggplant"],      section: "South" },
  { id: 11, state: "mine",         owner: "Elena V.",  since: "2023", crops: ["Tomatoes","Basil","Garlic"],section: "South" },
  { id: 12, state: "available",    section: "South" },
  { id: 13, state: "active",       owner: "Kenji T.",  since: "2020", crops: ["Daikon","Shiso"],          section: "South" },
  { id: 14, state: "help-needed",  owner: "Sue K.",    since: "2021", crops: ["Basil","Lettuce"],         section: "East" },
  { id: 15, state: "available",    section: "East" },
  { id: 16, state: "active",       owner: "Priya N.",  since: "2022", crops: ["Beans","Peas"],            section: "East" },
  { id: 17, state: "active",       owner: "Marco R.",  since: "2019", crops: ["Zucchini","Fennel"],       section: "East" },
  { id: 18, state: "available",    section: "East" },
];
