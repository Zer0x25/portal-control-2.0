import { afterEach, describe, expect, it, vi } from "vitest";

describe("IndexedDB module lifecycle", () => {
  afterEach(() => {
    vi.doUnmock("idb");
    vi.resetModules();
  });

  it("opens the database only on first use and shares that open promise", async () => {
    const database = {};
    const openDB = vi.fn().mockResolvedValue(database);
    vi.doMock("idb", () => ({ openDB, deleteDB: vi.fn() }));

    const indexedDBModule = await vi.importActual<typeof import("./indexedDB")>("./indexedDB");

    expect(openDB).not.toHaveBeenCalled();

    const firstOpen = indexedDBModule.getDBInstance();
    const secondOpen = indexedDBModule.getDBInstance();

    expect(openDB).toHaveBeenCalledTimes(1);
    expect(secondOpen).toBe(firstOpen);
    await expect(firstOpen).resolves.toBe(database);
  });
});
