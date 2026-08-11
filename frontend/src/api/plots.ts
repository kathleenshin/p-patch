import { apiFetch } from "@/lib/api";

/** Active steward summary returned on plot list/detail. */
export interface PlotOwner {
  id: number;
  name: string;
  is_primary: boolean;
  start_date: string | null;
}

/** Plot row from GET /api/plots/. */
export interface PlotRecord {
  id: number;
  garden: number;
  garden_name: string;
  plot_number: string;
  is_active: boolean;
  owners: PlotOwner[];
  has_open_help_request: boolean;
  help_status: "active" | "pending" | null;
  is_mine: boolean;
}

/** Uploaded plot picture from /api/plot-photos/ (local media URL or S3 URL). */
export interface PlotPhotoRecord {
  id: number;
  plot: number;
  uploaded_by: string;
  image: string;
  image_url: string;
  caption: string;
  created_at: string;
}

/** Fetch all plots the current user can see. */
export async function fetchPlots(
  token: string | null,
  signal?: AbortSignal,
): Promise<PlotRecord[]> {
  return apiFetch<PlotRecord[]>("/api/plots/", {
    token,
    signal,
  });
}

/**
 * Garden-admin: assign an approved member as primary steward of an unassigned plot.
 * POST /api/plots/<id>/assign/ with { user_id }.
 * Creates PlotOwnership (is_primary=True); user↔plot lives on that join table
 * (not a column on User). Response is the updated PlotRecord.
 */
export async function assignPlotSteward(
  plotId: number,
  userId: number,
  token: string,
): Promise<PlotRecord> {
  return apiFetch<PlotRecord>(`/api/plots/${plotId}/assign/`, {
    method: "POST",
    token,
    body: { user_id: userId },
  });
}

/** List photos for one plot (newest first from the API). */
export async function fetchPlotPhotos(
  plotId: number,
  token: string | null,
  signal?: AbortSignal,
): Promise<PlotPhotoRecord[]> {
  return apiFetch<PlotPhotoRecord[]>(
    `/api/plot-photos/?plot=${plotId}`,
    {
      token,
      signal,
    },
  );
}

/**
 * Upload a plot photo via multipart/form-data.
 * Backend stores the file on local disk or S3 depending on USE_S3.
 */
export async function uploadPlotPhoto(
  plotId: number,
  file: File,
  token: string | null,
  caption = "",
): Promise<PlotPhotoRecord> {
  const body = new FormData();
  body.append("plot", String(plotId));
  body.append("image", file);
  if (caption) {
    body.append("caption", caption);
  }

  return apiFetch<PlotPhotoRecord>("/api/plot-photos/", {
    method: "POST",
    token,
    body,
  });
}
