import { QueryObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getHealth, idbIsStoreEmpty, wipeAllData } = vi.hoisted(() => ({
  getHealth: vi.fn(),
  idbIsStoreEmpty: vi.fn(),
  wipeAllData: vi.fn(),
}));

const { fetchHealthData } = vi.hoisted(() => ({ fetchHealthData: vi.fn() }));

vi.mock("../../services/configService", () => ({
  configService: { getHealth: (...args: unknown[]) => getHealth(...args) },
}));

vi.mock("../../hooks/queries/useHealthQuery", () => ({
  healthQueryOptions: {
    queryKey: ["system", "health"],
    queryFn: fetchHealthData,
    staleTime: 15_000,
  },
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
import { healthQueryOptions } from "../../hooks/queries/useHealthQuery";

describe("sync de sesión ante cambio de instancia", () => {
  let unsubscribe: (() => void) | undefined;

  beforeEach(() => {
    queryClient.clear();
    localStorage.clear();
    getHealth.mockReset().mockResolvedValue({ instanceId: "db-new" });
    fetchHealthData.mockReset().mockResolvedValue({ status: "healthy", instanceId: "db-new" });
    idbIsStoreEmpty.mockReset().mockResolvedValue(false);
    wipeAllData.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    unsubscribe?.();
    unsubscribe = undefined;
    queryClient.clear();
  });

  it("comparte la lectura en vuelo y fuerza el refresco si detecta otra instancia", async () => {
    localStorage.setItem("db_instance_id", "db-old");

    let releaseHealth: ((value: { status: string; instanceId: string }) => void) | undefined;
    fetchHealthData.mockImplementationOnce(
      () =>
        new Promise<{ status: string; instanceId: string }>((resolve) => {
          releaseHealth = resolve;
        }),
    );
    const healthObserver = new QueryObserver(queryClient, healthQueryOptions);
    const stopHealthObserver = healthObserver.subscribe(() => undefined);
    await vi.waitFor(() => expect(fetchHealthData).toHaveBeenCalledTimes(1));

    const queryFn = vi.fn().mockResolvedValueOnce("old-data").mockResolvedValueOnce("new-data");
    const observer = new QueryObserver(queryClient, {
      queryKey: queryKeys.employees(),
      queryFn,
      staleTime: 5 * 60 * 1000,
    });
    const stopEmployeeObserver = observer.subscribe(() => undefined);
    unsubscribe = () => {
      stopHealthObserver();
      stopEmployeeObserver();
    };
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

    const initialization = state.initializeAppData();
    await Promise.resolve();
    expect(fetchHealthData).toHaveBeenCalledTimes(1);
    releaseHealth?.({ status: "healthy", instanceId: "db-new" });
    await initialization;

    expect(getHealth).not.toHaveBeenCalled();
    expect(wipeAllData).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("db_instance_id")).toBe("db-new");
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(observer.getCurrentResult().data).toBe("new-data");
  });

  it("mantiene el fallback fail-safe si falla la query compartida de salud", async () => {
    fetchHealthData.mockRejectedValueOnce(new TypeError("fetch failed"));

    const state = {
      currentUser: null,
      lastSyncTime: null,
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

    await expect(state.validateInstanceId()).resolves.toBe(true);
    expect(getHealth).not.toHaveBeenCalled();
    expect(wipeAllData).not.toHaveBeenCalled();
  });

  it("actualiza un instanceId cacheado antes de validar la instancia", async () => {
    queryClient.setQueryData(queryKeys.systemHealth(), {
      status: "healthy",
      instanceId: "db-cached",
    });
    fetchHealthData.mockResolvedValueOnce({ status: "healthy", instanceId: "db-current" });

    const state = {
      currentUser: null,
      lastSyncTime: null,
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

    await expect(state.validateInstanceId()).resolves.toBe(true);

    expect(fetchHealthData).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("db_instance_id")).toBe("db-current");
  });
});
