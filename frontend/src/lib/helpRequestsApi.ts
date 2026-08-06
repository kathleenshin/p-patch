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

export async function fetchHelpRequests(): Promise<HelpRequest[]> {
  return apiFetch<HelpRequest[]>('/api/help-requests/');
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

export async function fetchUsers(): Promise<UserOption[]> {
  const data = await apiFetch<unknown>('/api/auth/users/');
  return Array.isArray(data) ? (data as UserOption[]) : [];
}
