import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useQuickActionModalController } from "../../../features/time-control/hooks/useQuickActionModalController";

const { useAuthMock, useAccountingLockDateQueryMock, useControlInternoEnabledQueryMock } =
  vi.hoisted(() => ({
    useAuthMock: vi.fn(),
    useAccountingLockDateQueryMock: vi.fn(),
    useControlInternoEnabledQueryMock: vi.fn(),
  }));

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("../../../hooks/queries/useConfigQuery", () => ({
  useAccountingLockDateQuery: () => useAccountingLockDateQueryMock(),
  useControlInternoEnabledQuery: () => useControlInternoEnabledQueryMock(),
}));

describe("useQuickActionModalController", () => {
  it("arms after timeout and enables start break when in jornada", () => {
    vi.useFakeTimers();
    useAuthMock.mockReturnValue({ currentUser: { role: "Administrador" } });
    useAccountingLockDateQueryMock.mockReturnValue({ data: null });
    useControlInternoEnabledQueryMock.mockReturnValue({ data: true });

    const { result } = renderHook(() =>
      useQuickActionModalController({
        isOpen: true,
        record: {
          id: "r1",
          date: "2026-03-05",
          status: "Laborando",
          justification: null,
        } as any,
        clockStatus: "en_jornada",
        isActionDisabled: false,
        disabledTooltip: "",
      }),
    );

    expect(result.current.isArmed).toBe(false);
    act(() => {
      vi.advanceTimersByTime(801);
    });
    expect(result.current.isArmed).toBe(true);
    expect(result.current.canStartBreak).toBe(true);
    expect(result.current.canEndBreak).toBe(false);
    expect(result.current.activeTab).toBe("live");
    vi.useRealTimers();
  });

  it("locks record and prioritizes accounting lock tooltip", () => {
    useAuthMock.mockReturnValue({ currentUser: { role: "Supervisor Elevado" } });
    useAccountingLockDateQueryMock.mockReturnValue({ data: "2026-03-10" });
    useControlInternoEnabledQueryMock.mockReturnValue({ data: true });

    const { result } = renderHook(() =>
      useQuickActionModalController({
        isOpen: true,
        record: {
          id: "r2",
          date: "2026-03-01",
          status: "Laborando",
          justification: null,
        } as any,
        clockStatus: "en_jornada",
        isActionDisabled: false,
        disabledTooltip: "",
      }),
    );

    expect(result.current.isLocked).toBe(true);
    expect(result.current.finalTooltip).toBe("Registro bloqueado por cierre contable.");
  });
});
