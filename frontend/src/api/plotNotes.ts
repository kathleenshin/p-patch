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

export interface CreatePlotNoteInput {
  plot: number;
  content: string;
  visibility: PlotNoteRecord["visibility"];
}

export async function fetchPlotNotes(
  token: string | null,
  plotId: number
): Promise<PlotNoteRecord[]> {
  return apiFetch<PlotNoteRecord[]>(
    `/api/plot-notes/?plot=${plotId}`,
    {
      token,
    }
  );
}

export async function createPlotNote(
  token: string | null,
  note: CreatePlotNoteInput
): Promise<PlotNoteRecord> {
  return apiFetch<PlotNoteRecord>(
    "/api/plot-notes/",
    {
      method: "POST",
      token,
      body: JSON.stringify(note),
    }
  );
}