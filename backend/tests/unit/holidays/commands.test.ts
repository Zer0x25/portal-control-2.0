import { describe, expect, it, vi } from "vitest";
import {
  createHolidayCommands,
  type HolidayCommandDependencies,
} from "../../../src/modules/holidays/application/commands";

function fixture() {
  const deps: HolidayCommandDependencies = {
    repository: {
      create: vi.fn(async (data) => ({ ...data, createdAt: new Date(0), updatedAt: new Date(0) })),
      updateById: vi.fn(async (id, data) => ({
        id,
        ...data,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      })),
      upsertByDate: vi.fn(async (data) => ({
        ...data,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      })),
      findSummary: vi.fn(async () => ({ date: "2026-01-01", name: "Año Nuevo" })),
      delete: vi.fn(async () => ({})),
    },
    provider: {
      list: vi.fn(async () => [
        { date: "2026-01-01", title: "Año Nuevo", inalienable: true },
        { date: "2026-04-03", title: "Viernes Santo", inalienable: false },
      ]),
    },
    id: () => "new-id",
    year: () => 2026,
    audit: vi.fn(async () => {}),
    emit: vi.fn(),
  };
  return { deps, commands: createHolidayCommands(deps) };
}

describe("Holiday commands without infrastructure", () => {
  it("creates by input/default type and publishes the persisted row after audit", async () => {
    const { deps, commands } = fixture();
    const row = await commands.upsert({ date: "2026-01-01", name: "Año Nuevo" }, "supervisor");
    expect(deps.repository.create).toHaveBeenCalledWith({
      id: "new-id",
      date: "2026-01-01",
      name: "Año Nuevo",
      type: "Nacional",
      isRenounceable: false,
    });
    expect(deps.audit).toHaveBeenCalledWith({
      actorUsername: "supervisor",
      action: "HOLIDAY_UPSERT",
      category: "OPERATIONS",
      details: { date: row.date, name: row.name },
    });
    expect(deps.emit).toHaveBeenCalledWith(row);
  });
  it("updates by id when id is provided", async () => {
    const { deps, commands } = fixture();
    const row = await commands.upsert(
      {
        id: "existing-id",
        date: "2026-01-02",
        name: "Feriado Editado",
        type: "Regional",
        isRenounceable: true,
      },
      "supervisor",
    );
    expect(deps.repository.updateById).toHaveBeenCalledWith("existing-id", {
      date: "2026-01-02",
      name: "Feriado Editado",
      type: "Regional",
      isRenounceable: true,
    });
    expect(deps.emit).toHaveBeenCalledWith(row);
  });
  it("bulk writes every item and publishes one count", async () => {
    const { deps, commands } = fixture();
    expect(
      await commands.bulk(
        [
          { id: "a", date: "2026-01-01", name: "Uno", type: "Nacional" },
          { date: "2026-01-02", name: "Dos" },
        ],
        "bulk-actor",
      ),
    ).toBe(2);
    expect(deps.repository.upsertByDate).toHaveBeenCalledTimes(2);
    expect(deps.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUsername: "bulk-actor",
        action: "HOLIDAY_BULK_UPSERT",
        details: { count: 2 },
      }),
    );
    expect(deps.emit).toHaveBeenCalledWith({ type: "bulk", count: 2 });
  });
  it("deletes after reading summary, then audits and emits tombstone", async () => {
    const { deps, commands } = fixture();
    await commands.delete("existing", "delete-actor");
    expect(deps.repository.delete).toHaveBeenCalledWith("existing");
    expect(deps.audit).toHaveBeenCalledWith({
      actorUsername: "delete-actor",
      action: "HOLIDAY_DELETE",
      category: "OPERATIONS",
      severity: "WARNING",
      details: { id: "existing", date: "2026-01-01", name: "Año Nuevo" },
    });
    expect(deps.emit).toHaveBeenCalledWith({ id: "existing", isDeleted: true });
  });
  it("sync writes concurrently with Promise.all, type mapping and actor", async () => {
    const { deps, commands } = fixture();
    let concurrentCount = 0;
    let maxConcurrent = 0;
    vi.mocked(deps.repository.upsertByDate).mockImplementation(async (row) => {
      concurrentCount++;
      if (concurrentCount > maxConcurrent) {
        maxConcurrent = concurrentCount;
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
      concurrentCount--;
      return { ...row, createdAt: new Date(0), updatedAt: new Date(0) };
    });
    expect(await commands.sync(undefined, "sync-actor")).toEqual({
      success: true,
      total: 2,
      year: 2026,
    });
    expect(maxConcurrent).toBeGreaterThan(1);
    expect(deps.repository.upsertByDate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "Regional", isRenounceable: true }),
    );
    expect(deps.repository.upsertByDate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "Nacional", isRenounceable: false }),
    );
    expect(deps.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUsername: "sync-actor",
        action: "HOLIDAY_SYNC",
        details: { count: 2, year: 2026 },
      }),
    );
    expect(deps.emit).toHaveBeenCalledWith({ type: "sync", count: 2 });
  });
  it("provider failure causes no writes/audit/events", async () => {
    const { deps, commands } = fixture();
    vi.mocked(deps.provider.list).mockRejectedValue(new Error("provider invalid"));
    await expect(commands.sync(2025)).rejects.toThrow("provider invalid");
    expect(deps.repository.upsertByDate).not.toHaveBeenCalled();
    expect(deps.audit).not.toHaveBeenCalled();
    expect(deps.emit).not.toHaveBeenCalled();
  });
  it("write failure is propagated without publishing success", async () => {
    const { deps, commands } = fixture();
    vi.mocked(deps.repository.upsertByDate).mockRejectedValue(new Error("db failure"));
    await expect(commands.bulk([{ date: "2026-01-01", name: "Uno" }], "actor")).rejects.toThrow(
      "db failure",
    );
    expect(deps.audit).not.toHaveBeenCalled();
    expect(deps.emit).not.toHaveBeenCalled();
  });
});
