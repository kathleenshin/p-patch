/** Qty at or below this (when numeric) counts as low stock. */
export const LOW_STOCK_THRESHOLD = 2;

/** Minimal inventory list fields Admin needs for alert filtering. */
export type InventoryItemRow = {
  id: number;
  item: string;
  quantity: string;
};

/** One Admin alert row after client-side low/out-of-stock rules. */
export type InventoryAlert = {
  id: number;
  item: string;
  quantity: string;
  qtyValue: number;
  label: "Out of stock" | "Low stock";
};

/** Pull a leading number from quantity strings like "0", "2", "50 packets". */
export function parseQuantityValue(quantity: string): number | null {
  const match = quantity.trim().match(/^(\d+(?:\.\d+)?)/);
  if (!match) return null; // non-numeric qty (e.g. "Half bag") cannot be alerted on
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

/** Map inventory rows to Admin alerts (out of stock or low stock only). */
export function toInventoryAlert(item: InventoryItemRow): InventoryAlert | null {
  const qtyValue = parseQuantityValue(item.quantity);
  if (qtyValue == null) return null;
  // Zero (or negative parse) → out of stock.
  if (qtyValue <= 0) {
    return {
      id: item.id,
      item: item.item,
      quantity: item.quantity,
      qtyValue,
      label: "Out of stock",
    };
  }
  // Small positive qty → low stock (threshold is inclusive).
  if (qtyValue <= LOW_STOCK_THRESHOLD) {
    return {
      id: item.id,
      item: item.item,
      quantity: item.quantity,
      qtyValue,
      label: "Low stock",
    };
  }
  return null; // plenty in stock — omit from Admin alerts
}

/** Client-side Inventory Alerts list for Admin (phase 2). */
export function filterInventoryAlerts(
  items: InventoryItemRow[],
): InventoryAlert[] {
  return items
    .map(toInventoryAlert)
    .filter((alert): alert is InventoryAlert => alert != null);
}
