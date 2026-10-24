import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "../../constants";

const mocks = vi.hoisted(() => ({
  currentUser: null as unknown,
  employee: null as unknown,
  getEmployeeById: vi.fn(),
  users: [] as unknown[],
  isLoadingSchedulingData: false,
  getEmployeeDailyScheduleInfo: vi.fn(),
  startNewShift: vi.fn(async () => ({ success: true })),
  useScheduling: vi.fn(),
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ currentUser: mocks.currentUser }),
}));

vi.mock("../../hooks/useEmployees", () => ({
  useEmployees: () => ({ getEmployeeById: mocks.getEmployeeById }),
}));

vi.mock("../../hooks/useUsers", () => ({
  useUsers: () => ({ users: mocks.users }),
}));

vi.mock("../../hooks/useScheduling", () => ({
  useScheduling: (...args: unknown[]) => {
    mocks.useScheduling(...args);
    return {
      getEmployeeDailyScheduleInfo: mocks.getEmployeeDailyScheduleInfo,
      isLoadingSchedulingData: mocks.isLoadingSchedulingData,
    };
  },
}));

vi.mock("../../hooks/useShiftManager", () => ({
  useShiftManager: () => ({ startNewShift: mocks.startNewShift }),
}));

vi.mock("../../hooks/queries/useReportsQuery", () => ({
  useReportsQuery: () => ({ data: [] }),
}));

import { useLoginAutomations } from "../../hooks/useLoginAutomations";

describe("useLoginAutomations scheduling gate", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mocks.currentUser = {
      username: "operador",
      role: "Reloj_Control",
      employeeId: "EMP-1",
    };
    mocks.employee = { id: "EMP-1", position: "Reloj_Control" };
    mocks.getEmployeeById.mockImplementation(() => mocks.employee);
    mocks.users = [];
    mocks.isLoadingSchedulingData = false;
    mocks.getEmployeeDailyScheduleInfo.mockReturnValue({ isWorkDay: true, startTime: "00:00" });
    mocks.startNewShift.mockClear();
    mocks.useScheduling.mockClear();
  });

  afterEach(() => cleanup());

  it("gates scheduling for an Administrator without an employee", () => {
    mocks.currentUser = { username: "admin", role: "Administrador" };
    mocks.employee = null;

    renderHook(() => useLoginAutomations());

    expect(mocks.useScheduling).toHaveBeenCalledWith(undefined, undefined, { enabled: false });
    expect(mocks.startNewShift).not.toHaveBeenCalled();
  });

  it("waits for complete scheduling data before marking auto-start done", async () => {
    mocks.isLoadingSchedulingData = true;

    const { rerender } = renderHook(() => useLoginAutomations());

    expect(mocks.useScheduling).toHaveBeenCalledWith(undefined, undefined, { enabled: true });
    expect(sessionStorage.getItem(STORAGE_KEYS.AUTO_LOGIN_ACTIONS_DONE)).toBeNull();
    expect(mocks.startNewShift).not.toHaveBeenCalled();

    mocks.isLoadingSchedulingData = false;
    await act(async () => {
      rerender();
    });

    await waitFor(() => expect(mocks.startNewShift).toHaveBeenCalledTimes(1));
    expect(sessionStorage.getItem(STORAGE_KEYS.AUTO_LOGIN_ACTIONS_DONE)).toBe("true");
  });
});
