import { describe, expect, it } from "vitest";

import {
  filterInventoryAlerts,
  parseQuantityValue,
  toInventoryAlert,
} from "@/lib/adminInventoryAlerts";

describe("adminInventoryAlerts", () => {
  it("parseQuantityValue reads a leading number from qty strings", () => {
    expect(parseQuantityValue("0")).toBe(0);
    expect(parseQuantityValue("2")).toBe(2);
    expect(parseQuantityValue(" 50 packets ")).toBe(50);
    expect(parseQuantityValue("1.5 bags")).toBe(1.5);
    expect(parseQuantityValue("Half bag")).toBeNull();
    expect(parseQuantityValue("")).toBeNull();
  });

  it("toInventoryAlert marks qty 0 as out of stock and qty ≤ 2 as low", () => {
    expect(toInventoryAlert({ id: 1, item: "Twine", quantity: "0" })).toMatchObject({
      label: "Out of stock",
      qtyValue: 0,
    });
    expect(toInventoryAlert({ id: 2, item: "Gloves", quantity: "1" })).toMatchObject({
      label: "Low stock",
      qtyValue: 1,
    });
    expect(toInventoryAlert({ id: 3, item: "Seeds", quantity: "2 packets" })).toMatchObject({
      label: "Low stock",
      qtyValue: 2,
    });
    expect(toInventoryAlert({ id: 4, item: "Soil", quantity: "10" })).toBeNull();
    expect(toInventoryAlert({ id: 5, item: "Mulch", quantity: "a bit" })).toBeNull();
  });

  it("filterInventoryAlerts keeps only out-of-stock and low-stock rows", () => {
    const alerts = filterInventoryAlerts([
      { id: 1, item: "Twine", quantity: "0" },
      { id: 2, item: "Gloves", quantity: "2" },
      { id: 3, item: "Soil", quantity: "12 bags" },
      { id: 4, item: "Mulch", quantity: "Half bag" },
    ]);

    expect(alerts.map((row) => row.item)).toEqual(["Twine", "Gloves"]);
    expect(alerts.map((row) => row.label)).toEqual(["Out of stock", "Low stock"]);
  });
});
