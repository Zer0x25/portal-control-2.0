import { describe, expect, it } from "vitest";
import { STORES } from "./indexedDB";
import { filterValidIdbItems, hasIdbSchema, validateIdbItem } from "./idbValidation";

const validHoliday = {
  id: "h1",
  date: "2026-09-18",
  name: "Fiestas Patrias",
  type: "Nacional",
  lastModified: 1720000000000,
  syncStatus: "synced",
  isDeleted: false,
};

describe("idbValidation", () => {
  it("accepts valid items and unknown stores", () => {
    expect(() => validateIdbItem(STORES.HOLIDAYS, validHoliday)).not.toThrow();
    expect(() => validateIdbItem("unknown-store", { anything: 1 })).not.toThrow();
    expect(hasIdbSchema("unknown-store")).toBe(false);
  });

  it("rejects invalid items with the legacy error message", () => {
    expect(() => validateIdbItem(STORES.HOLIDAYS, { id: "h1" })).toThrow(
      `Invalid data structure for '${STORES.HOLIDAYS}'.`,
    );
  });

  it("drops invalid rows in bulk without aborting", () => {
    const items = [validHoliday, { id: "broken" }, { ...validHoliday, id: "h2" }];
    expect(filterValidIdbItems(STORES.HOLIDAYS, items)).toEqual([
      validHoliday,
      { ...validHoliday, id: "h2" },
    ]);
  });
});
