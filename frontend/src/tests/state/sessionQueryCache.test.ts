import { beforeEach, describe, expect, it, vi } from "vitest";

import { useStore } from "../../store/useStore";
import { queryClient } from "../../lib/queryClient";

const purgeMock = vi.fn().mockResolvedValue(undefined);
const wipeAllDataMock = vi.fn().mockResolvedValue(undefined);
const authLogoutMock = vi.fn().mockResolvedValue(undefined);
const loginMock = vi.fn();

vi.mock("../../lib/queryCache", () => ({
  QUERY_CACHE_OWNER_KEY: "saphr:query-cache-owner",
  purgePersistedQueryCache: (...args: unknown[]) => purgeMock(...args),
}));

vi.mock("../../utils/indexedDB", () => ({
  wipeAllData: (...args: unknown[]) => wipeAllDataMock(...args),
  idbGetAll: vi.fn().mockResolvedValue([]),
  idbPutBulk: vi.fn().mockResolvedValue(undefined),
  idbPut: vi.fn().mockResolvedValue(undefined),
  idbDelete: vi.fn().mockResolvedValue(undefined),
  idbGet: vi.fn().mockResolvedValue(null),
  idbGetAllBy: vi.fn().mockResolvedValue([]),
  idbIsStoreEmpty: vi.fn().mockResolvedValue(true),
  getSettingValue: vi.fn().mockResolvedValue(null),
  setSettingValue: vi.fn().mockResolvedValue(undefined),
  initDB: vi.fn(),
  getDB: vi.fn(),
  clockingStore: { getAll: vi.fn(), put: vi.fn(), clear: vi.fn() },
  authStore: { get: vi.fn(), put: vi.fn() },
  STORES: {
    EMPLOYEES: "employees",
    DAILY_TIME_RECORDS: "dailyTimeRecords",
    SHIFT_REPORTS: "shiftReports",
    APP_SETTINGS: "appSettings",
    AUDIT_LOGS: "auditLogs",
    USERS: "users",
    THEORETICAL_SHIFT_PATTERNS: "theoreticalShiftPatterns",
    ASSIGNED_SHIFTS: "assignedShifts",
    QUICK_NOTES: "quickNotes",
    METER_READINGS: "meterReadings",
    LEAVES: "leaves",
    HOLIDAYS: "holidays",
    CORRECTION_REQUESTS: "correctionRequests",
    KPI_CACHE: "kpiCache",
    CALENDAR_CACHE: "calendarCache",
  },
}));

vi.mock("../../services/authService", () => ({
  authService: {
    logout: (...args: unknown[]) => authLogoutMock(...args),
    login: (...args: unknown[]) => loginMock(...args),
    getToken: () => null,
    getAuthHeader: () => ({}),
    removeToken: vi.fn(),
    validateMFACode: vi.fn(),
  },
}));

const OWNER_KEY = "saphr:query-cache-owner";

describe("purga del cache persistido en sesion (spec 032 AC2.1)", () => {
  beforeEach(() => {
    purgeMock.mockClear();
    wipeAllDataMock.mockClear();
    authLogoutMock.mockClear();
    loginMock.mockClear();
    localStorage.clear();
    sessionStorage.clear();
    queryClient.clear();
  });

  it("logout purga el cache de queries y lo desvincula de la cuenta", async () => {
    localStorage.setItem(OWNER_KEY, "user-A");
    await queryClient.setQueryData(["config", "area_list"], ["Ops"]);

    await useStore.getState().logout();

    expect(purgeMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(OWNER_KEY)).toBeNull();
    expect(queryClient.getQueryData(["config", "area_list"])).toBeUndefined();
  });

  it("logout es idempotente (purge repetido no falla)", async () => {
    await expect(useStore.getState().logout()).resolves.toBeUndefined();
    await expect(useStore.getState().logout()).resolves.toBeUndefined();
    expect(purgeMock).toHaveBeenCalledTimes(2);
  });

  it("el purge no toca la cola offline (wipeAllData queda fuera del logout)", async () => {
    await useStore.getState().logout();

    expect(purgeMock).toHaveBeenCalledTimes(1);
    expect(wipeAllDataMock).not.toHaveBeenCalled();
  });

  it("al iniciar sesion como otro usuario se purga el cache del anterior", async () => {
    localStorage.setItem(OWNER_KEY, "user-A");
    const loginResponse = { userId: "user-B", username: "b", role: "Usuario" };
    loginMock.mockResolvedValue(loginResponse);

    await useStore.getState()._handleSuccessfulLogin(loginResponse);

    expect(purgeMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(OWNER_KEY)).toBe("user-B");
  });

  it("restaurar la sesion del mismo dueño no purga el cache", async () => {
    localStorage.setItem(OWNER_KEY, "user-A");
    sessionStorage.setItem("currentUser", JSON.stringify({ id: "user-A", username: "a" }));

    await useStore.getState()._verifyAuth();

    expect(purgeMock).not.toHaveBeenCalled();
  });

  it("restaurar una sesion de otro dueño purga antes de hidratar", async () => {
    localStorage.setItem(OWNER_KEY, "user-A");
    sessionStorage.setItem("currentUser", JSON.stringify({ id: "user-B", username: "b" }));

    await useStore.getState()._verifyAuth();

    expect(purgeMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(OWNER_KEY)).toBe("user-B");
  });
});
