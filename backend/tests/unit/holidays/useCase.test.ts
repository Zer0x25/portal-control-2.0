import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGetHolidays } from "../../../src/modules/holidays/application/getHolidays";
import type {
  HolidayDependencies,
  HolidayRecord,
} from "../../../src/modules/holidays/application/contracts";

const updatedAt = new Date("2026-01-01T02:00:00Z");
const row: HolidayRecord = {
  id: "holiday-1",
  date: "2026-01-01",
  name: "Año Nuevo",
  type: "Nacional",
  createdAt: updatedAt,
  updatedAt,
};
const view = { ...row, lastModified: updatedAt.getTime(), syncStatus: "synced", isDeleted: false };

describe("Holiday query use case without DB, HTTP or global clock", () => {
  let deps: HolidayDependencies;

  beforeEach(() => {
    deps = {
      repository: {
        list: vi.fn().mockResolvedValue([row]),
        count: vi.fn().mockResolvedValue(21),
        countYear: vi.fn().mockResolvedValue(1),
      },
      clock: { businessDate: () => "2025-12-31", year: () => 2026 },
      autosyncEnabled: () => true,
      sync: vi.fn().mockResolvedValue(undefined),
    };
  });

  it("B1: uses injected business date and enriches rows", async () => {
    expect(await createGetHolidays(deps)()).toEqual([view]);
    expect(deps.repository.list).toHaveBeenCalledWith({ dateFrom: "2025-12-31" });
    expect(deps.repository.countYear).toHaveBeenCalledWith(2026);
  });

  it("B2: search, archived and pagination preserve filtered total", async () => {
    expect(
      await createGetHolidays(deps)({
        page: 2,
        pageSize: 10,
        search: "  Año  ",
        showArchived: true,
      }),
    ).toEqual({ data: [view], meta: { total: 21, page: 2, pageSize: 10, totalPages: 3 } });
    expect(deps.repository.list).toHaveBeenCalledWith({ search: "Año", offset: 10, limit: 10 });
    expect(deps.repository.count).toHaveBeenCalledWith({ search: "Año" });
  });

  it("B3: delta bypasses business date and autosync", async () => {
    expect(await createGetHolidays(deps)({ since: String(updatedAt.getTime()) })).toEqual([view]);
    expect(deps.repository.list).toHaveBeenCalledWith({ updatedSince: updatedAt });
    expect(deps.repository.countYear).not.toHaveBeenCalled();
    expect(deps.sync).not.toHaveBeenCalled();
  });

  it("B4: syncs injected host year then rereads before counting", async () => {
    vi.mocked(deps.repository.countYear).mockResolvedValue(0);
    vi.mocked(deps.repository.list).mockResolvedValueOnce([]).mockResolvedValueOnce([row]);
    await createGetHolidays(deps)({ page: 1, pageSize: 10 });
    expect(deps.sync).toHaveBeenCalledExactlyOnceWith(2026);
    expect(deps.repository.list).toHaveBeenCalledTimes(2);
    expect(vi.mocked(deps.repository.list).mock.calls[1]).toEqual(
      vi.mocked(deps.repository.list).mock.calls[0],
    );
    expect(vi.mocked(deps.sync).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(deps.repository.list).mock.invocationCallOrder[1],
    );
    expect(vi.mocked(deps.repository.list).mock.invocationCallOrder[1]).toBeLessThan(
      vi.mocked(deps.repository.count).mock.invocationCallOrder[0],
    );
  });

  it.each([true, false])("B5: enabled=%s does not sync when year exists", async (enabled) => {
    deps.autosyncEnabled = () => enabled;
    await createGetHolidays(deps)();
    expect(deps.sync).not.toHaveBeenCalled();
    expect(deps.repository.countYear).toHaveBeenCalledTimes(enabled ? 1 : 0);
  });

  it("B6: propagates original sync error without a second read", async () => {
    const error = new Error("provider failed");
    vi.mocked(deps.repository.countYear).mockResolvedValue(0);
    vi.mocked(deps.sync).mockRejectedValue(error);
    await expect(createGetHolidays(deps)()).rejects.toBe(error);
    expect(deps.repository.list).toHaveBeenCalledTimes(1);
    expect(deps.repository.count).not.toHaveBeenCalled();
  });

  it("preserves legacy truthy invalid since: no date filter or autosync", async () => {
    await createGetHolidays(deps)({ since: "invalid" });
    expect(deps.repository.list).toHaveBeenCalledWith({});
    expect(deps.sync).not.toHaveBeenCalled();
    expect(deps.repository.countYear).not.toHaveBeenCalled();
  });

  it("preserves host-year rollover while the presence query is in flight", async () => {
    deps.clock.year = vi.fn().mockReturnValueOnce(2025).mockReturnValue(2026);
    vi.mocked(deps.repository.countYear).mockResolvedValue(0);
    await createGetHolidays(deps)();
    expect(deps.repository.countYear).toHaveBeenCalledWith(2025);
    expect(deps.sync).toHaveBeenCalledWith(2026);
  });
});
