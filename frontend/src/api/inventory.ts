const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

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
  const response = await fetch(inventoryUrl());
  if (!response.ok) {
    throw new Error("Unable to load inventory items");
  }
  return response.json();
}

const DEFAULT_GARDEN_ID = Number(import.meta.env.VITE_DEFAULT_GARDEN_ID || 1);

export async function createInventoryItem(payload: {
  item: string;
  quantity: string;
  location: string;
  garden_id?: number;
}): Promise<InventoryItem> {
  const response = await fetch(inventoryUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...payload, garden_id: payload.garden_id ?? DEFAULT_GARDEN_ID }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Unable to create inventory item");
  }

  return response.json();
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
  const response = await fetch(inventoryUrl(`${id}/`), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...payload, garden_id: payload.garden_id ?? DEFAULT_GARDEN_ID }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Unable to update inventory item");
  }

  return response.json();
}

export async function deleteInventoryItem(id: number): Promise<void> {
  const response = await fetch(inventoryUrl(`${id}/`), {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Unable to delete inventory item");
  }
}
