import { apiFetch } from "./api";
import type { AuthUser } from "./authApi";

/**
 * Garden-admin client helpers for the approval loop.
 * Session login/register/me live in authApi.ts.
 */

/** GET /api/auth/pending/ — unapproved users (garden admin only). */
export async function fetchPendingUsers(
  accessToken: string,
): Promise<AuthUser[]> {
  return apiFetch<AuthUser[]>("/api/auth/pending/", {
    method: "GET",
    token: accessToken,
  });
}

/** POST /api/auth/pending/<id>/approve/ — unlocks full member access. */
export async function approveUser(
  accessToken: string,
  userId: number,
): Promise<AuthUser> {
  return apiFetch<AuthUser>(`/api/auth/pending/${userId}/approve/`, {
    method: "POST",
    token: accessToken,
  });
}

/** POST /api/auth/pending/<id>/reject/ — deletes the pending signup. */
export async function rejectUser(
  accessToken: string,
  userId: number,
): Promise<void> {
  await apiFetch<void>(`/api/auth/pending/${userId}/reject/`, {
    method: "POST",
    token: accessToken,
  });
}

/** GET /api/auth/users/ — all users (garden admin only); filter for approved assignees. */
export async function fetchUsers(accessToken: string): Promise<AuthUser[]> {
  return apiFetch<AuthUser[]>("/api/auth/users/", {
    method: "GET",
    token: accessToken,
  });
}
