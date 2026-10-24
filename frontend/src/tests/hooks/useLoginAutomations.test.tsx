import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: null as unknown,
  employee: null as unknown,
  getEmployeeById: vi.fn(),
  users: [] as unknown[],
  shiftReports: [] as unknown[],
  useScheduling: vi.fn(),
  getEmployeeDailyScheduleInfo: vi.fn(),
  startNewShift: vi.fn(async () => ({ success: true })),
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
  useScheduling: (...args: unknown[]) => mocks.useScheduling(...args),
}));

vi.mock("../../hooks/useShiftManager", () => ({
  useShiftManager: () => ({ startNewShift: mocks.startNewShift }),
}));

vi.mock("../../hooks/queries/useReportsQuery", () => ({
  useReportsQuery: () => ({ data: mocks.shiftReports }),
}));

import { useLoginAutomations } from "../../hooks/useLoginAutomations";

describe("useLoginAutomations deferred scheduling gate", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mocks.currentUser = { username: "admin", role: "Administrador" };
    mocks.employee = null;
    mocks.getEmployeeById.mockImplementation(() => mocks.employee);
    mocks.users = [];
    mocks.shiftReports = [];
    mocks.useScheduling.mockReset();
    mocks.getEmployeeDailyScheduleInfo.mockReturnValue({ isWorkDay: true, startTime: "00:00" });
    mocks.startNewShift.mockReset();
    mocks.useScheduling.mockReturnValue({
      getEmployeeDailyScheduleInfo: mocks.getEmployeeDailyScheduleInfo,
      isLoadingSchedulingData: false,
    });
  });

  afterEach(() => cleanup());

  it("does not enable the scheduling component for an Administrator without an employee", () => {
    const { result } = renderHook(() => useLoginAutomations());

    expect(result.current.isAutoStartEligible).toBe(false);
    expect(mocks.useScheduling).not.toHaveBeenCalled();
  });

  it("marks an eligible employee without importing scheduling hooks into the layout", () => {
    mocks.currentUser = {
      username: "ana",
      role: "Administrador",
      employeeId: "EMP-1",
    };
    mocks.employee = { id: "EMP-1", position: "Reloj_Control" };

    const { result } = renderHook(() => useLoginAutomations());

    expect(result.current.isAutoStartEligible).toBe(true);
    expect(mocks.useScheduling).not.toHaveBeenCalled();
  });

  it("keeps the shift handover check available to applicable roles", async () => {
    mocks.users = [{ username: "ana", employeeId: "EMP-1" }];
    mocks.employee = { id: "EMP-1", name: "Ana" };
    mocks.shiftReports = [
      {
        status: "closed",
        endTime: "2026-10-23T18:00:00.000Z",
        responsibleUser: "ana",
        logEntries: [],
      },
    ];

    const { result } = renderHook(() => useLoginAutomations());

    await waitFor(() => expect(result.current.isHandoverModalOpen).toBe(true));
    expect(result.current.handoverData?.responsibleUser).toBe("Ana");
    expect(mocks.useScheduling).not.toHaveBeenCalled();
  });
});
