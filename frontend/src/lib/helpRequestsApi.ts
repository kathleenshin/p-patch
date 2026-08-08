import { apiFetch } from "./api";

export interface HelpRequest {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  assigned_to: number | null;
  created_by: number | null;
  due_date: string | null;
}

export interface UserOption {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
}

/** Unclaimed = no assignee and not completed (Admin Unclaimed Tasks panel). */
export function isUnclaimedHelpRequest(request: HelpRequest): boolean {
  return request.assigned_to == null && request.status !== "done";
}

/** List help requests (pass JWT; required once authz is IsApproved). */
export async function fetchHelpRequests(accessToken: string): Promise<HelpRequest[]> {
  return apiFetch<HelpRequest[]>("/api/help-requests/", { token: accessToken });
}

export async function createHelpRequest(payload: {
  title: string;
  description: string;
  priority: string;
  category: string;
  due_date: string | null;
  assigned_to: number | null;
  garden: number;
}): Promise<HelpRequest> {
  return apiFetch<HelpRequest>('/api/help-requests/', {
    method: 'POST',
    body: payload,
  });
}

export async function updateHelpRequest(id: number, payload: Partial<HelpRequest> & { status?: string }): Promise<HelpRequest> {
  return apiFetch<HelpRequest>(`/api/help-requests/${id}/`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function deleteHelpRequest(id: number): Promise<void> {
  await apiFetch<void>(`/api/help-requests/${id}/`, {
    method: 'DELETE',
  });
}

export async function fetchUsers(accessToken: string): Promise<UserOption[]> {
  const data = await apiFetch<unknown>('/api/help-requests/assignees/', {
    method: 'GET',
    token: accessToken,
  });
  return Array.isArray(data) ? (data as UserOption[]) : [];
}

/** Garden-admin only: re-broadcast claim email for an unclaimed help request. */
export async function resendHelpRequestClaim(
  accessToken: string,
  id: number,
): Promise<{ detail: string; recipients: number }> {
  return apiFetch(`/api/help-requests/${id}/resend-claim/`, {
    method: "POST",
    token: accessToken,
  });
}
