import { describe, expect, it, vi } from "vitest";
import {
  createHolidayCommands,
  type HolidayCommandDependencies,
} from "../../../src/modules/holidays/application/commands";

function fixture() {
  const deps: HolidayCommandDependencies = {
    repository: {
      upsert: vi.fn(async (data) => ({ ...data, createdAt: new Date(0), updatedAt: new Date(0) })),
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
  it("upserts by input/default type and publishes the persisted row after audit", async () => {
    const { deps, commands } = fixture();
    const row = await commands.upsert({ date: "2026-01-01", name: "Año Nuevo" }, "supervisor");
    expect(deps.repository.upsert).toHaveBeenCalledWith({
      id: "new-id",
      date: "2026-01-01",
      name: "Año Nuevo",
      type: "Nacional",
    });
    expect(deps.audit).toHaveBeenCalledWith({
      actorUsername: "supervisor",
      action: "HOLIDAY_UPSERT",
      category: "OPERATIONS",
      details: { date: row.date, name: row.name },
    });
    expect(deps.emit).toHaveBeenCalledWith(row);
  });
  it("bulk writes every item and publishes one count", async () => {
    const { deps, commands } = fixture();
    expect(
      await commands.bulk(
        [
          { id: "a", date: "2026-01-01", name: "Uno", type: "Civil" },
          { date: "2026-01-02", name: "Dos" },
        ],
        "bulk-actor",
      ),
    ).toBe(2);
    expect(deps.repository.upsert).toHaveBeenCalledTimes(2);
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
  it("sync keeps sequential writes, type mapping and actor", async () => {
    const { deps, commands } = fixture();
    let running = 0;
    vi.mocked(deps.repository.upsert).mockImplementation(async (row) => {
      expect(++running).toBe(1);
      await Promise.resolve();
      running--;
      return { ...row, createdAt: new Date(0), updatedAt: new Date(0) };
    });
    expect(await commands.sync(undefined, "sync-actor")).toEqual({
      success: true,
      total: 2,
      year: 2026,
    });
    expect(deps.repository.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: "Regional" }),
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
    expect(deps.repository.upsert).not.toHaveBeenCalled();
    expect(deps.audit).not.toHaveBeenCalled();
    expect(deps.emit).not.toHaveBeenCalled();
  });
  it("write failure is propagated without publishing success", async () => {
    const { deps, commands } = fixture();
    vi.mocked(deps.repository.upsert).mockRejectedValue(new Error("db failure"));
    await expect(commands.bulk([{ date: "2026-01-01", name: "Uno" }], "actor")).rejects.toThrow(
      "db failure",
    );
    expect(deps.audit).not.toHaveBeenCalled();
    expect(deps.emit).not.toHaveBeenCalled();
  });
});
