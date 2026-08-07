import { apiFetch } from "@/lib/api";

export interface PlotNoteRecord {
  id: number;
  plot: number;
  author: string;
  content: string;
  visibility:
    | "this_plot"
    | "all_plots_in_garden"
    | "garden_members";
  created_at: string;
}