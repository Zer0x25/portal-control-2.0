import { describe, expect, it, vi, beforeEach } from "vitest";
import { WorkCoordinator } from "../../src/services/workCoordinator";
import { prismaDirect, withDirectTransaction } from "../../src/services/db";

vi.mock("../../src/services/db", () => ({
  prismaDirect: {
    $executeRaw: vi.fn(async () => 0),
    $queryRaw: vi.fn(async () => [{ busy: false }]),
  },
  withDirectTransaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      $queryRaw: vi.fn(async () => [{ maintenance_permit: null }]),
      $executeRaw: vi.fn(async () => 1),
    };
    return await fn(tx);
  }),
}));

describe("Anti-regression: WorkCoordinator stale coordination pruning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("triggers pruneStaleCoordination on the first enter call (lazy reconciliation)", async () => {
    const coordinator = new WorkCoordinator();
    const lease1 = await coordinator.enter("req-1");
    expect(lease1.id).toBeDefined();

    // 3 executeRaw calls in pruneStaleCoordination (locks, gate, permits)
    expect(prismaDirect.$executeRaw).toHaveBeenCalledTimes(3);

    // Second enter call should not trigger prune again because reconciled is true
    const lease2 = await coordinator.enter("req-2");
    expect(lease2.id).toBeDefined();
    expect(prismaDirect.$executeRaw).toHaveBeenCalledTimes(3);

    await lease1.release();
    await lease2.release();
  });

  it("tolerates database errors during lazy pruning without aborting enter", async () => {
    const coordinator = new WorkCoordinator();
    vi.mocked(prismaDirect.$executeRaw).mockRejectedValueOnce(new Error("DB connection error"));

    // enter should still succeed because pruneStaleCoordination catches errors
    const lease = await coordinator.enter("req-safe");
    expect(lease.id).toBeDefined();
    await lease.release();
  });

  it("prunes stale coordination upon entering maintenance", async () => {
    const coordinator = new WorkCoordinator();
    const release = await coordinator.maintenance("scheduled-maint");
    expect(typeof release).toBe("function");

    expect(prismaDirect.$executeRaw).toHaveBeenCalled();
    await release();
  });
});
