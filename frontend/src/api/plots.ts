import { apiFetch } from "@/lib/api";

export interface PlotOwner {
  id: number;
  name: string;
  is_primary: boolean;
  start_date: string | null;
}

export interface PlotRecord {
  id: number;
  garden: number;
  garden_name: string;
  plot_number: string;
  is_active: boolean;
  owners: PlotOwner[];
  has_open_help_request: boolean;
  is_mine: boolean;
}

export async function fetchPlots(
  token: string | null,
  signal?: AbortSignal,
): Promise<PlotRecord[]> {
  return apiFetch<PlotRecord[]>("/api/plots/", {
    token,
    signal,
  });
}