import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    apiFetch: (...args: unknown[]) => apiFetchMock(...args),
  };
});

import {
  fetchPlotPhotos,
  fetchPlots,
  uploadPlotPhoto,
  type PlotPhotoRecord,
} from "@/api/plots";

const samplePhoto: PlotPhotoRecord = {
  id: 7,
  plot: 3,
  uploaded_by: "ada@example.com",
  image: "plots/3/garden.jpg",
  image_url: "http://127.0.0.1:8000/media/plots/3/garden.jpg",
  caption: "Spring bed",
  created_at: "2026-08-08T12:00:00Z",
};

describe("plots API helpers", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("fetchPlots requests /api/plots/ with the access token", async () => {
    apiFetchMock.mockResolvedValueOnce([]);

    await fetchPlots("access-token");

    expect(apiFetchMock).toHaveBeenCalledWith("/api/plots/", {
      token: "access-token",
      signal: undefined,
    });
  });

  it("fetchPlotPhotos requests photos filtered by plot id", async () => {
    apiFetchMock.mockResolvedValueOnce([samplePhoto]);

    const result = await fetchPlotPhotos(3, "access-token");

    expect(apiFetchMock).toHaveBeenCalledWith("/api/plot-photos/?plot=3", {
      token: "access-token",
      signal: undefined,
    });
    expect(result).toEqual([samplePhoto]);
  });

  it("uploadPlotPhoto posts multipart FormData with plot and image", async () => {
    apiFetchMock.mockResolvedValueOnce(samplePhoto);
    const file = new File(["fake-bytes"], "garden.jpg", {
      type: "image/jpeg",
    });

    const result = await uploadPlotPhoto(3, file, "access-token", "Spring bed");

    expect(result).toEqual(samplePhoto);
    expect(apiFetchMock).toHaveBeenCalledTimes(1);

    const [path, options] = apiFetchMock.mock.calls[0] as [
      string,
      { method: string; token: string; body: FormData },
    ];
    expect(path).toBe("/api/plot-photos/");
    expect(options.method).toBe("POST");
    expect(options.token).toBe("access-token");
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get("plot")).toBe("3");
    expect(options.body.get("caption")).toBe("Spring bed");
    expect(options.body.get("image")).toBeInstanceOf(File);
  });

  it("uploadPlotPhoto omits caption when blank", async () => {
    apiFetchMock.mockResolvedValueOnce(samplePhoto);
    const file = new File(["fake-bytes"], "garden.jpg", {
      type: "image/jpeg",
    });

    await uploadPlotPhoto(3, file, "access-token");

    const [, options] = apiFetchMock.mock.calls[0] as [
      string,
      { body: FormData },
    ];
    expect(options.body.get("caption")).toBeNull();
  });
});
