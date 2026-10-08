import { beforeEach, describe, expect, it, vi } from "vitest";
import { phase1Service } from "../src/services/seeder/Phase1Service";
import prisma from "../src/services/db";

vi.mock("../src/services/db", () => ({
  default: {
    systemConfig: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

describe("Phase1Service.seedSystemConfigs - accounting_lock_date", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates accounting_lock_date as end of month for current-3 months when missing", async () => {
    vi.setSystemTime(new Date("2026-02-26T12:00:00.000Z"));

    vi.mocked(prisma.systemConfig.findMany).mockResolvedValue([
      { key: "max_weekly_hours" },
      { key: "AUTH_SESSION_DURATIONS" },
    ] as any);
    vi.mocked(prisma.systemConfig.createMany).mockResolvedValue({ count: 1 });

    const progress: string[] = [];
    await phase1Service.seedSystemConfigs((msg) => progress.push(msg));

    expect(prisma.systemConfig.createMany).toHaveBeenCalledTimes(1);
    expect(prisma.systemConfig.createMany).toHaveBeenCalledWith({
      data: [{ key: "accounting_lock_date", value: JSON.stringify("2025-11-30") }],
      skipDuplicates: true,
    });
    expect(
      progress.some((m) => m.includes("accounting_lock_date=2025-11-30") && m.includes("3 meses")),
    ).toBe(true);
  });

  it("preserves existing accounting_lock_date and does not overwrite", async () => {
    vi.setSystemTime(new Date("2026-02-26T12:00:00.000Z"));

    vi.mocked(prisma.systemConfig.findMany).mockResolvedValue([
      { key: "max_weekly_hours" },
      { key: "AUTH_SESSION_DURATIONS" },
      { key: "accounting_lock_date" },
    ] as any);

    const progress: string[] = [];
    await phase1Service.seedSystemConfigs((msg) => progress.push(msg));

    expect(prisma.systemConfig.createMany).toHaveBeenCalledWith({ data: [], skipDuplicates: true });
    expect(
      progress.some(
        (m) =>
          m.includes("accounting_lock_date") &&
          m.includes("preservada") &&
          m.includes("no sobrescrita"),
      ),
    ).toBe(true);
  });
});
