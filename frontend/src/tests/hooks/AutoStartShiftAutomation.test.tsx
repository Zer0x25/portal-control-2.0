import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "../../constants";

const mocks = vi.hoisted(() => ({
  currentUser: null as unknown,
  isLoadingSchedulingData: false,
  getEmployeeDailyScheduleInfo: vi.fn(),
  startNewShift: vi.fn(async () => ({ success: true })),
  useScheduling: vi.fn(),
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ currentUser: mocks.currentUser }),
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

import AutoStartShiftAutomation from "../../components/layout/AutoStartShiftAutomation";

describe("AutoStartShiftAutomation", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mocks.currentUser = {
      username: "operador",
      role: "Reloj_Control",
      employeeId: "EMP-1",
    };
    mocks.isLoadingSchedulingData = false;
    mocks.getEmployeeDailyScheduleInfo.mockReturnValue({ isWorkDay: true, startTime: "00:00" });
    mocks.startNewShift.mockReset();
    mocks.useScheduling.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("waits for complete scheduling data before starting and marking the session", async () => {
    mocks.isLoadingSchedulingData = true;
    const { rerender } = render(<AutoStartShiftAutomation useClockingOptions />);

    expect(mocks.useScheduling).toHaveBeenCalledWith(undefined, undefined, {
      enabled: true,
      useClockingOptions: true,
    });
    expect(sessionStorage.getItem(STORAGE_KEYS.AUTO_LOGIN_ACTIONS_DONE)).toBeNull();
    expect(mocks.startNewShift).not.toHaveBeenCalled();

    mocks.isLoadingSchedulingData = false;
    await act(async () => rerender(<AutoStartShiftAutomation useClockingOptions />));

    await waitFor(() => expect(mocks.startNewShift).toHaveBeenCalledTimes(1));
    expect(sessionStorage.getItem(STORAGE_KEYS.AUTO_LOGIN_ACTIONS_DONE)).toBe("true");
  });

  it("does not start before the scheduled time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 24, 9, 0, 0));
    const future = new Date(Date.now() + 60 * 60 * 1000);
    mocks.getEmployeeDailyScheduleInfo.mockReturnValue({
      isWorkDay: true,
      startTime: `${String(future.getHours()).padStart(2, "0")}:${String(future.getMinutes()).padStart(2, "0")}`,
    });

    render(<AutoStartShiftAutomation />);

    expect(mocks.startNewShift).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(STORAGE_KEYS.AUTO_LOGIN_ACTIONS_DONE)).toBe("true");
  });

  it("honors the existing session guard", () => {
    sessionStorage.setItem(STORAGE_KEYS.AUTO_LOGIN_ACTIONS_DONE, "true");

    render(<AutoStartShiftAutomation />);

    expect(mocks.getEmployeeDailyScheduleInfo).not.toHaveBeenCalled();
    expect(mocks.startNewShift).not.toHaveBeenCalled();
  });
});
