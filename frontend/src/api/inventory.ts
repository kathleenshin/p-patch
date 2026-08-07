import { apiFetch } from "../lib/api";
import { getAccessToken } from "../lib/authStorage";
const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

function inventoryUrl(path = "") {
  return `${API_BASE_URL}/api/inventory/${path}`.replace(/\/+$|([^:])\/\/+/g, "$1/");
}

export type InventoryItem = {
  id: number;
  garden_id: number;
  garden_name: string | null;
  item: string;
  quantity: string;
  location: string;
  added_by: string | null;
  created_at: string;
};

export async function fetchInventoryItems(): Promise<InventoryItem[]> {
  return apiFetch<InventoryItem[]>("/api/inventory/", { token: getAccessToken() });
}

const DEFAULT_GARDEN_ID = Number(import.meta.env.VITE_DEFAULT_GARDEN_ID || 1);

export async function createInventoryItem(payload: {
  item: string;
  quantity: string;
  location: string;
  garden_id?: number;
}): Promise<InventoryItem> {
  return apiFetch<InventoryItem>("/api/inventory/", {
    method: "POST",
    token: getAccessToken(),
    body: { ...payload, garden_id: payload.garden_id ?? DEFAULT_GARDEN_ID },
  });
}

export async function updateInventoryItem(
  id: number,
  payload: {
    item: string;
    quantity: string;
    location: string;
    garden_id?: number;
  }
): Promise<InventoryItem> {
  return apiFetch<InventoryItem>(`/api/inventory/${id}/`, {
    method: "PUT",
    token: getAccessToken(),
    body: { ...payload, garden_id: payload.garden_id ?? DEFAULT_GARDEN_ID },
  });
}

export async function deleteInventoryItem(id: number): Promise<void> {
  await apiFetch<void>(`/api/inventory/${id}/`, {
    method: "DELETE",
    token: getAccessToken(),
  });
}
