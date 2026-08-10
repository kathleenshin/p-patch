import { apiFetch } from "./api";

/** Community board post from GET/POST /api/announcements/. */
export type Announcement = {
  id: number;
  body: string;
  author: number;
  author_name: string;
  author_email: string;
  created_at: string;
};

/** List announcements for the Dashboard Community board (any logged-in user). */
export async function fetchAnnouncements(
  accessToken: string,
): Promise<Announcement[]> {
  // Server also purges posts older than 30 days on this GET.
  return apiFetch<Announcement[]>("/api/announcements/", {
    method: "GET",
    token: accessToken,
  });
}

/** Garden-admin only: create a post shown on the Dashboard Community board. */
export async function createAnnouncement(
  accessToken: string,
  body: string,
): Promise<Announcement> {
  return apiFetch<Announcement>("/api/announcements/", {
    method: "POST",
    token: accessToken,
    body: { body },
  });
}
