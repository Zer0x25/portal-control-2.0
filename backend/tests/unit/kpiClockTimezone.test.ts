import { expect, it, vi } from "vitest";
import type { Employee, TimeRecord } from "../../src/generated/prisma/client";
import type { SchedulingContext } from "../../src/services/schedulingService";

const data = vi.hoisted(() => ({ records: vi.fn() }));
vi.mock("../../src/services/db", () => ({
  default: { timeRecord: { findMany: data.records } },
}));
vi.mock("../../src/services/schedulingService", () => ({
  schedulingService: { getEmployeeDailyScheduleInfo: vi.fn().mockResolvedValue(null) },
}));
import { KpiStatsService } from "../../src/services/kpi/KpiStatsService";
import { KpiCache } from "../../src/services/kpi/KpiCache";
import { readMonthlyBreakdown } from "../../src/services/kpi/monthlyBreakdown";

it.each([
  ["2026-11-16", "2026-11-16T11:55:00Z", "2026-11-16T15:00:00Z", "08:55 - 12:00"],
  ["2026-06-16", "2026-06-16T12:00:00Z", "2026-06-16T16:00:00Z", "08:00 - 12:00"],
  ["2026-11-16", "2026-11-16T11:55:00Z", null, "08:55 - ???"],
])(
  "formats punches for %s in Chile regardless of server timezone",
  async (date, entrada, salida, expected) => {
    const employee = { id: "e", workdayType: "Normal" } as Employee;
    const record = { date, entrada, salida, status: "Normal" } as TimeRecord;
    const day = new Date(`${date}T12:00:00Z`);
    const details = await new KpiStatsService().calculateRangeMetrics(
      employee,
      day,
      day,
      {} as SchedulingContext,
      [record],
    );
    expect(details[0].actualClocks).toBe(expected);
  },
);

it("regenerates a version 2 cached month with Chile clock times", async () => {
  const employee = { id: "e", workdayType: "Normal" } as Employee;
  data.records.mockResolvedValue([
    {
      date: "2026-11-16",
      entrada: "2026-11-16T11:55:00Z",
      salida: "2026-11-16T15:00:00Z",
      status: "Normal",
    },
  ]);
  const oldCache = {
    dailyBreakdown: JSON.stringify({ version: 2, sourceRevision: "42", days: [] }),
  };
  const get = vi.spyOn(KpiCache.prototype, "getMonthlyStats").mockResolvedValue(oldCache as never);
  const save = vi
    .spyOn(KpiCache.prototype, "saveMonthlyStats")
    .mockImplementation(async (input) => input as never);
  try {
    const result = await new KpiStatsService().ensureMonthlyCache(
      "e",
      2026,
      11,
      employee,
      {} as SchedulingContext,
      "42",
    );
    expect(save).toHaveBeenCalledOnce();
    expect(readMonthlyBreakdown(result.dailyBreakdown, 2026, 11, "42")?.[15].actualClocks).toBe(
      "08:55 - 12:00",
    );
  } finally {
    get.mockRestore();
    save.mockRestore();
  }
});
