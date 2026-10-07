import { describe, expect, it } from "vitest";
import {
  readMonthlyBreakdown,
  serializeMonthlyBreakdown,
} from "../../src/services/kpi/monthlyBreakdown";
const days = (year: number, month: number) =>
  Array.from({ length: new Date(Date.UTC(year, month, 0)).getUTCDate() }, (_, index) => ({
    isoDate: `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`,
    date: "label",
    dayOfWeek: "Monday",
    scheduledShift: "Libre",
    actualClocks: "Sin Marcaje",
    scheduledHours: 0,
    workedHours: 0,
    overtime: 0,
    colacionMinutes: 0,
    differenceHours: 0,
    isHoliday: false,
    status: "Normal",
  }));
describe("Monthly KPI cache contract", () => {
  it.each([
    [2024, 2],
    [2026, 2],
    [2026, 9],
    [2026, 12],
  ])("accepts a full %i-%i", (year, month) => {
    const rows = days(year, month);
    expect(readMonthlyBreakdown(serializeMonthlyBreakdown(rows), year, month)).toEqual(rows);
  });
  it.each(["not-json", "null", "[]", "{}", '{"version":99,"days":[]}'])(
    "rejects legacy/corrupt %s",
    (raw) => {
      expect(readMonthlyBreakdown(raw, 2026, 9)).toBeNull();
    },
  );
  it("rejects missing, duplicate, wrong-month and malformed days", () => {
    const rows = days(2026, 9);
    for (const invalid of [
      rows.slice(1),
      [...rows.slice(0, -1), rows[0]],
      days(2026, 4),
      rows.map((day, i) => (i ? day : { ...day, workedHours: "8" })),
      rows.map((day, i) => (i ? day : null)),
    ]) {
      expect(
        readMonthlyBreakdown(JSON.stringify({ version: 1, days: invalid }), 2026, 9),
      ).toBeNull();
    }
  });
});
