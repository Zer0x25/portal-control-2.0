import { expect, it, vi } from "vitest";
const aggregate = vi.hoisted(() => vi.fn());
vi.mock("../../src/services/db", () => ({ default: { kpiSourceRevision: { aggregate } } }));
import { KpiCache } from "../../src/services/kpi/KpiCache";
it("preserves bigint generation precision across every stripe", async () => {
  aggregate.mockResolvedValue({ _count: { id: 64 }, _sum: { revision: 9007199254740993n } });
  expect(await new KpiCache().getSourceRevision()).toBe("9007199254740993");
});
it("accepts a complete zero generation", async () => {
  aggregate.mockResolvedValue({ _count: { id: 64 }, _sum: { revision: 0n } });
  expect(await new KpiCache().getSourceRevision()).toBe("0");
});
it.each([0, 63, 65])("fails closed with %i revision stripes", async (count) => {
  aggregate.mockResolvedValue({ _count: { id: count }, _sum: { revision: count ? 1n : null } });
  await expect(new KpiCache().getSourceRevision()).rejects.toThrow(
    "Incomplete KPI source revision stripes",
  );
});
