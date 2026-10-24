import { QueryObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getHealth, idbIsStoreEmpty, wipeAllData } = vi.hoisted(() => ({
  getHealth: vi.fn(),
  idbIsStoreEmpty: vi.fn(),
  wipeAllData: vi.fn(),
}));

const { fetchReadinessData } = vi.hoisted(() => ({ fetchReadinessData: vi.fn() }));

vi.mock("../../services/configService", () => ({
  configService: { getHealth: (...args: unknown[]) => getHealth(...args) },
}));

vi.mock("../../hooks/queries/useHealthQuery", () => ({
  readinessQueryOptions: {
    queryKey: ["system", "readiness"],
    queryFn: fetchReadinessData,
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
import { readinessQueryOptions } from "../../hooks/queries/useHealthQuery";
import { STORES } from "../../utils/indexedDB";

type SyncDiagnosticDetail = {
  phase: "validation" | "cache-check" | "sync-step";
  name: string;
  durationMs: number;
  outcome: "success" | "failure";
};

const createAdminSyncState = (
  lastSyncTime: number | null = null,
  onSet?: (partial: Partial<AppState>) => void,
): AppState => {
  if (lastSyncTime !== null) localStorage.setItem("lastSyncTime", lastSyncTime.toString());

  const state = {
    currentUser: { id: "admin-1", role: "Administrador" },
    lastSyncTime,
    isSyncing: false,
    syncState: "success",
    syncProgress: 0,
    isInitialSync: false,
    currentSyncStep: "",
    addToast: vi.fn(),
  } as unknown as AppState;
  const set = ((partial: Partial<AppState>) => {
    onSet?.(partial);
    Object.assign(state, partial);
  }) as Parameters<typeof createSyncSlice>[0];
  const get = (() => state) as Parameters<typeof createSyncSlice>[1];
  const api = {} as Parameters<typeof createSyncSlice>[2];
  Object.assign(state, createSyncSlice(set, get, api));
  return state;
};

describe("sync de sesión ante cambio de instancia", () => {
  let unsubscribe: (() => void) | undefined;

  beforeEach(() => {
    queryClient.clear();
    localStorage.clear();
    getHealth.mockReset().mockResolvedValue({ instanceId: "db-new" });
    fetchReadinessData
      .mockReset()
      .mockResolvedValue({ status: "ready", healthStatus: "healthy", instanceId: "db-new" });
    idbIsStoreEmpty.mockReset().mockResolvedValue(false);
    wipeAllData.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    unsubscribe?.();
    unsubscribe = undefined;
    delete (window as Window & { __PORTAL_SYNC_PERF_DIAGNOSTICS__?: boolean })
      .__PORTAL_SYNC_PERF_DIAGNOSTICS__;
    queryClient.clear();
  });

  it("does not emit sync diagnostics by default", async () => {
    const events: SyncDiagnosticDetail[] = [];
    const listener = (event: Event) => {
      events.push((event as CustomEvent<SyncDiagnosticDetail>).detail);
    };
    window.addEventListener("portal:sync-phase", listener);

    await createAdminSyncState().initializeAppData();

    window.removeEventListener("portal:sync-phase", listener);
    expect(events).toEqual([]);
    expect(idbIsStoreEmpty).not.toHaveBeenCalled();
  });

  it("skips critical-store reads when there is no previous sync marker", async () => {
    await createAdminSyncState().runSync();

    expect(idbIsStoreEmpty).not.toHaveBeenCalled();
  });

  it("checks both critical stores when a previous sync marker exists", async () => {
    await createAdminSyncState(Date.now()).runSync();

    expect(idbIsStoreEmpty.mock.calls).toEqual([[STORES.EMPLOYEES], [STORES.USERS]]);
  });

  it("keeps the existing full-sync branch when both stores are empty", async () => {
    idbIsStoreEmpty.mockResolvedValue(true);
    const stateUpdates: Partial<AppState>[] = [];

    await createAdminSyncState(Date.now(), (partial) => stateUpdates.push(partial)).runSync();

    expect(stateUpdates).toContainEqual({ isInitialSync: true, syncProgress: 0 });
  });

  it("emits only phase timings when opt-in diagnostics are enabled", async () => {
    const diagnosticWindow = window as Window & { __PORTAL_SYNC_PERF_DIAGNOSTICS__?: boolean };
    diagnosticWindow.__PORTAL_SYNC_PERF_DIAGNOSTICS__ = true;
    const events: SyncDiagnosticDetail[] = [];
    const listener = (event: Event) => {
      events.push((event as CustomEvent<SyncDiagnosticDetail>).detail);
    };
    window.addEventListener("portal:sync-phase", listener);

    await createAdminSyncState(Date.now()).initializeAppData();

    window.removeEventListener("portal:sync-phase", listener);
    expect(events.map(({ phase, name }) => [phase, name])).toEqual([
      ["validation", "validateInstanceId"],
      ["cache-check", "criticalStores"],
      ["sync-step", "Usuarios"],
      ["sync-step", "Empleados"],
      ["sync-step", "Configuraciones"],
      ["sync-step", "Horarios"],
      ["sync-step", "Medidores"],
    ]);
    expect(
      events.every(
        ({ durationMs, outcome }) =>
          Number.isFinite(durationMs) && durationMs >= 0 && outcome === "success",
      ),
    ).toBe(true);
    expect(Object.keys(events[0] ?? {}).sort()).toEqual(["durationMs", "name", "outcome", "phase"]);
  });

  it("records a failed cache check and preserves the sync error path", async () => {
    const diagnosticWindow = window as Window & { __PORTAL_SYNC_PERF_DIAGNOSTICS__?: boolean };
    diagnosticWindow.__PORTAL_SYNC_PERF_DIAGNOSTICS__ = true;
    idbIsStoreEmpty.mockRejectedValueOnce(new Error("IndexedDB unavailable"));
    const events: SyncDiagnosticDetail[] = [];
    const listener = (event: Event) => {
      events.push((event as CustomEvent<SyncDiagnosticDetail>).detail);
    };
    window.addEventListener("portal:sync-phase", listener);

    await createAdminSyncState(Date.now()).initializeAppData();

    window.removeEventListener("portal:sync-phase", listener);
    expect(events.map(({ phase, name, outcome }) => [phase, name, outcome])).toEqual([
      ["validation", "validateInstanceId", "success"],
      ["cache-check", "criticalStores", "failure"],
    ]);
  });

  it("comparte la lectura en vuelo y fuerza el refresco si detecta otra instancia", async () => {
    localStorage.setItem("db_instance_id", "db-old");

    let releaseHealth:
      | ((value: {
          status: "ready";
          healthStatus: "healthy" | "degraded";
          instanceId: string;
        }) => void)
      | undefined;
    fetchReadinessData.mockImplementationOnce(
      () =>
        new Promise<{
          status: "ready";
          healthStatus: "healthy" | "degraded";
          instanceId: string;
        }>((resolve) => {
          releaseHealth = resolve;
        }),
    );
    const readinessObserver = new QueryObserver(queryClient, readinessQueryOptions);
    const stopReadinessObserver = readinessObserver.subscribe(() => undefined);
    await vi.waitFor(() => expect(fetchReadinessData).toHaveBeenCalledTimes(1));

    const queryFn = vi.fn().mockResolvedValueOnce("old-data").mockResolvedValueOnce("new-data");
    const observer = new QueryObserver(queryClient, {
      queryKey: queryKeys.employees(),
      queryFn,
      staleTime: 5 * 60 * 1000,
    });
    const stopEmployeeObserver = observer.subscribe(() => undefined);
    unsubscribe = () => {
      stopReadinessObserver();
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
    expect(fetchReadinessData).toHaveBeenCalledTimes(1);
    releaseHealth?.({ status: "ready", healthStatus: "healthy", instanceId: "db-new" });
    await initialization;

    expect(getHealth).not.toHaveBeenCalled();
    expect(wipeAllData).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("db_instance_id")).toBe("db-new");
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(observer.getCurrentResult().data).toBe("new-data");
  });

  it("mantiene el fallback fail-safe si falla la query compartida de salud", async () => {
    fetchReadinessData.mockRejectedValueOnce(new TypeError("fetch failed"));

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
    queryClient.setQueryData(queryKeys.systemReadiness(), {
      status: "ready",
      healthStatus: "healthy",
      instanceId: "db-cached",
    });
    fetchReadinessData.mockResolvedValueOnce({
      status: "ready",
      healthStatus: "healthy",
      instanceId: "db-current",
    });

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

    expect(fetchReadinessData).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("db_instance_id")).toBe("db-current");
  });
});
