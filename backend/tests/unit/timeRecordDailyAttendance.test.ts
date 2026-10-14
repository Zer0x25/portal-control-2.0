import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  timeRecord: { findMany: vi.fn() },
  systemConfig: { findUnique: vi.fn() },
}));

vi.mock("../../src/services/db", () => ({ default: db }));

import { TimeRecordService } from "../../src/services/TimeRecordService";

const row = (extra: Record<string, unknown> = {}) => ({
  date: "2026-03-05",
  employeeId: "e1",
  entrada: "2026-03-05T08:00:00-03:00",
  status: "Laborando",
  scheduledStartTime: "08:00",
  ...extra,
});

describe("TimeRecordService.dailyAttendance", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("aggregates present/total/late per day with zero-filled gaps", async () => {
    db.timeRecord.findMany.mockResolvedValue([
      row({ employeeId: "e1", entrada: "2026-03-05T08:20:00-03:00" }), // 20 min tarde
      row({ employeeId: "e2", entrada: "2026-03-05T08:10:00-03:00" }), // dentro de tolerancia
      row({ employeeId: "e3", status: "Vacaciones" }), // ausencia: cuenta en total, no en presentes
    ]);

    const series = await TimeRecordService.dailyAttendance(
      { desde: "2026-03-05", hasta: "2026-03-06" },
      { id: "u", username: "admin", role: "Administrador" },
    );

    expect(series).toEqual([
      { date: "2026-03-05", present: 2, total: 3, late: 1 },
      { date: "2026-03-06", present: 0, total: 0, late: 0 },
    ]);
    // Una sola query indexada, sin enrich ni scheduling (sin N+1).
    expect(db.timeRecord.findMany).toHaveBeenCalledTimes(1);
    expect(db.timeRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: { gte: "2026-03-05", lte: "2026-03-06" },
        }),
      }),
    );
  });

  it("scopes Usuario role to their own employee", async () => {
    db.timeRecord.findMany.mockResolvedValue([]);

    await TimeRecordService.dailyAttendance(
      { desde: "2026-03-05", hasta: "2026-03-05", employeeId: "otro" },
      { id: "u", username: "juan", role: "Usuario", employeeId: "e9" },
    );

    expect(db.timeRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ employeeId: "e9" }),
      }),
    );
  });

  it("rejects Usuario without linked employee", async () => {
    await expect(
      TimeRecordService.dailyAttendance(
        { desde: "2026-03-05", hasta: "2026-03-05" },
        { id: "u", username: "juan", role: "Usuario", employeeId: null },
      ),
    ).rejects.toThrow("UNAUTHORIZED_NO_EMPLOYEE");
  });
});
