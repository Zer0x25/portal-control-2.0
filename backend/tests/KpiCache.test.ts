import { describe, it, expect, vi, beforeEach } from "vitest";
import { KpiCache } from "../src/services/kpi/KpiCache";
import prisma from "../src/services/db";

// Mock prisma
vi.mock("../src/services/db", () => ({
  default: {
    systemConfig: {
      findUnique: vi.fn(),
    },
    monthlyEmployeeStats: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

describe("KpiCache - Accounting Lock", () => {
  let kpiCache: KpiCache;

  beforeEach(() => {
    kpiCache = new KpiCache();
    vi.clearAllMocks();
  });

  it("should return false (OPEN) for current month", async () => {
    // Mock Date to 2024-05-15
    const mockDate = new Date("2024-05-15T12:00:00Z");
    vi.setSystemTime(mockDate);

    // Current month: May 2024. Previous: April.
    // Logic: Current and Previous are OPEN. Older (March) are LOCKED.

    // Check May 2024
    const isLocked = await kpiCache.isMonthLocked(2024, 5);
    expect(isLocked).toBe(false);
  });

  it("should return false (OPEN) for previous month", async () => {
    const mockDate = new Date("2024-05-15T12:00:00Z");
    vi.setSystemTime(mockDate);

    // Check April 2024
    const isLocked = await kpiCache.isMonthLocked(2024, 4);
    expect(isLocked).toBe(false);
  });

  it("should return true (LOCKED) for two months ago", async () => {
    const mockDate = new Date("2024-05-15T12:00:00Z");
    vi.setSystemTime(mockDate);

    // Check March 2024
    const isLocked = await kpiCache.isMonthLocked(2024, 3);
    expect(isLocked).toBe(true);
  });

  it("should return true (LOCKED) for last year", async () => {
    const mockDate = new Date("2024-05-15T12:00:00Z");
    vi.setSystemTime(mockDate);

    const isLocked = await kpiCache.isMonthLocked(2023, 12);
    expect(isLocked).toBe(true);
  });

  it("should respect Manual Lock override (locking normally open month)", async () => {
    const mockDate = new Date("2024-05-15T12:00:00Z");
    vi.setSystemTime(mockDate);

    // May 2024 is normally OPEN.
    // Set Manual Lock to June 2024 (Future) -> Locks everything before June.
    (prisma.systemConfig.findUnique as any).mockResolvedValue({
      key: "accounting_lock_date",
      value: '"2024-06-01"',
    });

    const isLocked = await kpiCache.isMonthLocked(2024, 5);
    expect(isLocked).toBe(true);
  });

  it("should respect Manual Lock override (unlocking normally locked month? - No, strict hierarchy usually)", async () => {
    // Current Logic:
    // 1. Check Rolling Lock (If Locked -> Return True?)
    // Wait, let's check code.
    // Code says:
    // if (rollingLocked) return true;
    // 2. Check Manual Lock
    // if (manualLocked) return true;

    // So Manual Lock can only LOCK MORE, not UNLOCK.
    // If rolling says LOCKED (March 2024), manual lock at 2024-01-01 (Jan) won't unlock March.

    const mockDate = new Date("2024-05-15T12:00:00Z");
    vi.setSystemTime(mockDate);

    // March 2024 is Rolling Locked.
    // Set manual lock to 2024-02-01.
    (prisma.systemConfig.findUnique as any).mockResolvedValue({
      key: "accounting_lock_date",
      value: '"2024-02-01"',
    });

    const isLocked = await kpiCache.isMonthLocked(2024, 3); // Rolling Locked
    expect(isLocked).toBe(true);
  });
});
