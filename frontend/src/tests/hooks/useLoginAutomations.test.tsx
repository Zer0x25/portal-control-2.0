import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: null as unknown,
  employee: null as unknown,
  getEmployeeById: vi.fn(),
  users: [] as unknown[],
  usersLoading: false,
  usersQueryEnabled: null as boolean | null,
  usersQueryEnablement: [] as boolean[],
  shiftReports: [] as unknown[],
  reportsLoading: false,
  reportsQueryEnabled: null as boolean | null,
  reportsQueryEnablement: [] as boolean[],
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
  useUsers: (options?: { enabled?: boolean }) => {
    mocks.usersQueryEnabled = options?.enabled ?? true;
    mocks.usersQueryEnablement.push(mocks.usersQueryEnabled);
    return { users: mocks.users, isLoadingUsers: mocks.usersLoading };
  },
}));

vi.mock("../../hooks/useScheduling", () => ({
  useScheduling: (...args: unknown[]) => mocks.useScheduling(...args),
}));

vi.mock("../../hooks/useShiftManager", () => ({
  useShiftManager: () => ({ startNewShift: mocks.startNewShift }),
}));

vi.mock("../../hooks/queries/useReportsQuery", () => ({
  useReportsQuery: (_params?: unknown, options?: { enabled?: boolean }) => {
    mocks.reportsQueryEnabled = options?.enabled ?? true;
    mocks.reportsQueryEnablement.push(mocks.reportsQueryEnabled);
    return { data: mocks.shiftReports, isLoading: mocks.reportsLoading };
  },
}));

import { useLoginAutomations } from "../../hooks/useLoginAutomations";

describe("useLoginAutomations deferred scheduling gate", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mocks.currentUser = { username: "admin", role: "Administrador" };
    mocks.employee = null;
    mocks.getEmployeeById.mockImplementation(() => mocks.employee);
    mocks.users = [];
    mocks.usersLoading = false;
    mocks.usersQueryEnabled = null;
    mocks.usersQueryEnablement = [];
    mocks.shiftReports = [];
    mocks.reportsLoading = false;
    mocks.reportsQueryEnabled = null;
    mocks.reportsQueryEnablement = [];
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

  it("does not request the user directory when reports contain no pending handover", async () => {
    renderHook(() => useLoginAutomations());

    await waitFor(() => expect(sessionStorage.getItem("shiftHandoverViewed")).toBe("true"));
    expect(mocks.reportsQueryEnablement).toContain(true);
    expect(mocks.reportsQueryEnabled).toBe(false);
    expect(mocks.usersQueryEnabled).toBe(false);
  });

  it("waits for reports before completing the handover check and resolving its user", async () => {
    mocks.reportsLoading = true;
    const { result, rerender } = renderHook(() => useLoginAutomations());

    expect(sessionStorage.getItem("shiftHandoverViewed")).toBeNull();
    expect(mocks.usersQueryEnabled).toBe(false);

    mocks.reportsLoading = false;
    mocks.usersLoading = true;
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
    rerender();

    expect(mocks.usersQueryEnabled).toBe(true);
    expect(sessionStorage.getItem("shiftHandoverViewed")).toBeNull();
    expect(result.current.isHandoverModalOpen).toBe(false);

    mocks.usersLoading = false;
    rerender();
    await waitFor(() => expect(result.current.isHandoverModalOpen).toBe(true));
    expect(result.current.handoverData?.responsibleUser).toBe("Ana");
    expect(sessionStorage.getItem("shiftHandoverViewed")).toBe("true");
  });

  it("uses the report username without querying the restricted directory", async () => {
    mocks.currentUser = { username: "clock", role: "Reloj_Control" };
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
    expect(result.current.handoverData?.responsibleUser).toBe("ana");
    expect(mocks.usersQueryEnabled).toBe(false);
  });
});
