import { beforeEach, describe, expect, it, vi } from "vitest";
import { phase1Service } from "../src/services/seeder/Phase1Service";
import prisma from "../src/services/db";

vi.mock("../src/services/db", () => ({
  default: {
    systemConfig: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("Phase1Service.seedSystemConfigs - accounting_lock_date", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates accounting_lock_date as end of month for current-3 months when missing", async () => {
    vi.setSystemTime(new Date("2026-02-26T12:00:00.000Z"));

    (prisma.systemConfig.findUnique as any).mockImplementation(async ({ where }: any) => {
      if (where.key === "accounting_lock_date") return null;
      return { key: where.key, value: "existing" };
    });
    (prisma.systemConfig.create as any).mockResolvedValue({});

    const progress: string[] = [];
    await phase1Service.seedSystemConfigs((msg) => progress.push(msg));

    expect(prisma.systemConfig.create).toHaveBeenCalledTimes(1);
    expect(prisma.systemConfig.create).toHaveBeenCalledWith({
      data: {
        key: "accounting_lock_date",
        value: JSON.stringify("2025-11-30"),
      },
    });
    expect(
      progress.some((m) => m.includes("accounting_lock_date=2025-11-30") && m.includes("3 meses")),
    ).toBe(true);
  });

  it("preserves existing accounting_lock_date and does not overwrite", async () => {
    vi.setSystemTime(new Date("2026-02-26T12:00:00.000Z"));

    (prisma.systemConfig.findUnique as any).mockImplementation(async ({ where }: any) => {
      if (where.key === "accounting_lock_date") {
        return { key: "accounting_lock_date", value: JSON.stringify("2024-12-31") };
      }
      return { key: where.key, value: "existing" };
    });

    const progress: string[] = [];
    await phase1Service.seedSystemConfigs((msg) => progress.push(msg));

    expect(prisma.systemConfig.create).not.toHaveBeenCalled();
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
