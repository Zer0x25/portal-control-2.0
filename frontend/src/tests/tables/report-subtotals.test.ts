import { describe, it, expect } from "vitest";
import { DailyReportItem } from "../../types/index";
import {
  buildReportRowsWithSubtotals,
  getReportWeekId,
  isReportSubtotal,
} from "../../utils/reportSubtotals";

const makeItem = (overrides: Partial<DailyReportItem>): DailyReportItem => ({
  date: "05/01/2026",
  isoDate: "2026-01-05",
  dayOfWeek: "Lunes",
  scheduledShift: "09:00-18:00",
  actualClocks: "09:00-18:00",
  scheduledHours: 8,
  colacionMinutes: 60,
  workedHours: 8,
  differenceHours: 0,
  ...overrides,
});

describe("buildReportRowsWithSubtotals", () => {
  it("devuelve [] para entrada vacía", () => {
    expect(buildReportRowsWithSubtotals([])).toEqual([]);
  });

  it("agrupa por semana y añade subtotal + total", () => {
    const data = [
      makeItem({
        isoDate: "2026-01-05",
        scheduledHours: 8,
        workedHours: 7,
        differenceHours: -1,
        colacionMinutes: 60,
      }),
      makeItem({
        isoDate: "2026-01-06",
        scheduledHours: 8,
        workedHours: 8,
        differenceHours: 0,
        colacionMinutes: 30,
      }),
    ];
    const rows = buildReportRowsWithSubtotals(data);
    expect(rows).toHaveLength(4); // 2 items + 1 subtotal + 1 total
    expect(rows[2]).toMatchObject({
      type: "subtotal",
      totals: { scheduledHours: 16, workedHours: 15, differenceHours: -1, colacionMinutes: 90 },
    });
    expect(rows[3]).toMatchObject({
      type: "total",
      weekId: "grand-total",
      totals: { scheduledHours: 16, workedHours: 15, differenceHours: -1, colacionMinutes: 90 },
    });
  });

  it("ordena las semanas por fecha ascendente", () => {
    const data = [
      makeItem({ isoDate: "2026-01-12", scheduledHours: 5 }),
      makeItem({ isoDate: "2026-01-05", scheduledHours: 3 }),
    ];
    const rows = buildReportRowsWithSubtotals(data);
    const subtotals = rows.filter(isReportSubtotal);
    expect(subtotals[0].weekId).toBe("2026-01-05T00:00:00.000Z");
    expect(subtotals[1].weekId).toBe("2026-01-12T00:00:00.000Z");
  });

  it("salta items sin fecha en el agrupado pero los incluye en el total general", () => {
    const data = [
      makeItem({ isoDate: "2026-01-05", scheduledHours: 8 }),
      makeItem({ isoDate: "", date: "", scheduledHours: 4 }),
    ];
    const rows = buildReportRowsWithSubtotals(data);
    // Solo 1 subtotal (la semana con fecha) + 1 total
    const subtotals = rows.filter(isReportSubtotal);
    expect(subtotals).toHaveLength(2);
    const total = subtotals.find((s) => s.type === "total")!;
    expect(total.totals.scheduledHours).toBe(12);
  });

  it("no muta la entrada", () => {
    const data = [makeItem({ isoDate: "2026-01-05" })];
    const snapshot = JSON.stringify(data);
    buildReportRowsWithSubtotals(data);
    expect(JSON.stringify(data)).toBe(snapshot);
  });

  it("getReportWeekId devuelve null sin fecha", () => {
    expect(getReportWeekId(makeItem({ isoDate: "", date: "" }))).toBeNull();
  });
});
