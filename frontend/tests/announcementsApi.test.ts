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
  createAnnouncement,
  fetchAnnouncements,
  type Announcement,
} from "@/lib/announcementsApi";

const sampleAnnouncement: Announcement = {
  id: 1,
  body: "Work party Saturday.",
  author: 2,
  author_name: "Ada Lovelace",
  author_email: "ada@example.com",
  created_at: "2026-08-01T12:00:00Z",
};

describe("announcementsApi", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("fetchAnnouncements lists Community board posts with token", async () => {
    apiFetchMock.mockResolvedValueOnce([sampleAnnouncement]);

    const rows = await fetchAnnouncements("access-token");

    expect(apiFetchMock).toHaveBeenCalledWith("/api/announcements/", {
      method: "GET",
      token: "access-token",
    });
    expect(rows).toEqual([sampleAnnouncement]);
  });

  it("createAnnouncement posts body for garden admins", async () => {
    apiFetchMock.mockResolvedValueOnce(sampleAnnouncement);

    const created = await createAnnouncement("access-token", "Work party Saturday.");

    expect(apiFetchMock).toHaveBeenCalledWith("/api/announcements/", {
      method: "POST",
      token: "access-token",
      body: { body: "Work party Saturday." },
    });
    expect(created.body).toBe("Work party Saturday.");
  });
});
