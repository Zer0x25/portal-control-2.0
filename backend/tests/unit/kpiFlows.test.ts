import { describe, expect, it, vi } from "vitest";
import { createKpiFlows } from "../../src/modules/kpis";
function fixture() {
  const service = {
    summary: vi.fn().mockResolvedValue({ kpis: {} }),
    detailed: vi.fn().mockResolvedValue({ summary: [] }),
    overview: vi.fn().mockResolvedValue({ teamStatus: {} }),
    daily: vi.fn().mockResolvedValue({ activeCount: 0 }),
  };
  const dates = {
    exclusive: vi.fn((_: string, end: string) => end + "-next"),
    compare: vi.fn(() => -1),
    duration: vi.fn(() => 86400000),
  };
  return { service, dates, flows: createKpiFlows({ service, dates }) };
}
describe("KPI pure orchestration", () => {
  it("normalizes inclusive end, gives exclusive precedence and preserves response shape", async () => {
    const f = fixture();
    await expect(
      f.flows.summary({ startDate: "2026-01-01", endDate: "2026-01-01", area: "A" }),
    ).resolves.toEqual({ kpis: {} });
    expect(f.service.summary).toHaveBeenCalledWith({
      startDate: "2026-01-01",
      endDate: "2026-01-01",
      endDateExclusive: "2026-01-01-next",
      area: "A",
      employeeIds: undefined,
    });
    await f.flows.detailed({
      startDate: "2026-01-01",
      endDate: "ignored",
      endDateExclusive: "2026-01-02",
    });
    expect(f.dates.exclusive).toHaveBeenCalledTimes(1);
    expect(f.service.detailed).toHaveBeenCalledWith(
      expect.objectContaining({ endDateExclusive: "2026-01-02" }),
    );
  });
  it("rejects missing or non increasing ranges before service effects", async () => {
    const f = fixture();
    await expect(f.flows.summary({ startDate: "" })).rejects.toMatchObject({ statusCode: 400 });
    f.dates.compare.mockReturnValue(0);
    await expect(
      f.flows.detailed({ startDate: "2026-01-01", endDateExclusive: "2026-01-01" }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(f.service.summary).not.toHaveBeenCalled();
    expect(f.service.detailed).not.toHaveBeenCalled();
  });
  it("limits all ranges to one year except exactly one employee allowing five", async () => {
    const f = fixture();
    const year = 365.25 * 86400000;
    const input = { startDate: "2020-01-01", endDateExclusive: "2024-01-01" };
    f.dates.duration.mockReturnValue(year);
    await f.flows.summary(input);
    f.dates.duration.mockReturnValue(year + 1);
    for (const employeeIds of [undefined, [], ["a", "b"]])
      await expect(f.flows.summary({ ...input, employeeIds })).rejects.toMatchObject({
        statusCode: 400,
      });
    f.dates.duration.mockReturnValue(5 * year);
    await f.flows.detailed({ ...input, employeeIds: ["a"] });
    f.dates.duration.mockReturnValue(5 * year + 1);
    await expect(f.flows.detailed({ ...input, employeeIds: ["a"] })).rejects.toMatchObject({
      statusCode: 400,
    });
  });
  it("passes overview/daily responses and preserves infrastructure errors", async () => {
    const f = fixture();
    await expect(f.flows.overview()).resolves.toEqual({ teamStatus: {} });
    await expect(f.flows.daily()).resolves.toEqual({ activeCount: 0 });
    const error = new Error("storage failed");
    f.service.summary.mockRejectedValue(error);
    await expect(f.flows.summary({ startDate: "2026-01-01", endDate: "2026-01-01" })).rejects.toBe(
      error,
    );
  });
});
