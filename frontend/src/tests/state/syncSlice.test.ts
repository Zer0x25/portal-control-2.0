import { QueryObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getHealth, idbIsStoreEmpty, wipeAllData } = vi.hoisted(() => ({
  getHealth: vi.fn(),
  idbIsStoreEmpty: vi.fn(),
  wipeAllData: vi.fn(),
}));

vi.mock("../../services/configService", () => ({
  configService: { getHealth: (...args: unknown[]) => getHealth(...args) },
}));

vi.mock("../../utils/indexedDB", () => ({
  idbIsStoreEmpty: (...args: unknown[]) => idbIsStoreEmpty(...args),
  wipeAllData: (...args: unknown[]) => wipeAllData(...args),
  STORES: { EMPLOYEES: "employees", USERS: "users" },
}));

import type { AppState } from "../../store/types";
import { createSyncSlice } from "../../store/slices/syncSlice";
import { queryClient } from "../../lib/queryClient";
import { queryKeys } from "../../lib/queryKeys";

describe("sync de sesión ante cambio de instancia", () => {
  let unsubscribe: (() => void) | undefined;

  beforeEach(() => {
    queryClient.clear();
    localStorage.clear();
    getHealth.mockResolvedValue({ instanceId: "db-new" });
    idbIsStoreEmpty.mockResolvedValue(false);
    wipeAllData.mockResolvedValue(undefined);
  });

  afterEach(() => {
    unsubscribe?.();
    unsubscribe = undefined;
    queryClient.clear();
  });

  it("fuerza el refresco de la caché activa después de detectar otro servidor", async () => {
    localStorage.setItem("db_instance_id", "db-old");
    const queryFn = vi.fn().mockResolvedValueOnce("old-data").mockResolvedValueOnce("new-data");
    const observer = new QueryObserver(queryClient, {
      queryKey: queryKeys.employees(),
      queryFn,
      staleTime: 5 * 60 * 1000,
    });
    unsubscribe = observer.subscribe(() => undefined);
    await vi.waitFor(() => expect(observer.getCurrentResult().data).toBe("old-data"));
    queryFn.mockClear();

    const state = {
      currentUser: { id: "admin-1", role: "Administrador" },
      lastSyncTime: Date.now(),
      isSyncing: false,
      syncState: "success",
      syncProgress: 0,
      isInitialSync: false,
      currentSyncStep: "",
      addToast: vi.fn(),
    } as unknown as AppState;
    const set = ((partial: Partial<AppState>) => Object.assign(state, partial)) as Parameters<
      typeof createSyncSlice
    >[0];
    const get = (() => state) as Parameters<typeof createSyncSlice>[1];
    const api = {} as Parameters<typeof createSyncSlice>[2];
    Object.assign(state, createSyncSlice(set, get, api));

    await state.initializeAppData();

    expect(wipeAllData).toHaveBeenCalledTimes(1);
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(observer.getCurrentResult().data).toBe("new-data");
  });
});
