import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useHeaderController } from "../../hooks/layout/useHeaderController";

const mocks = vi.hoisted(() => ({
  currentUser: null as { id: string; username: string; role: string; mfaEnabled?: boolean } | null,
  logout: vi.fn(async () => undefined),
  markMfaEnabled: vi.fn(),
  invalidateQueries: vi.fn(async () => undefined),
  setSoundEnabled: vi.fn(),
}));

vi.mock("react-router", () => ({
  useLocation: () => ({ pathname: "/dashboard" }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    currentUser: mocks.currentUser,
    logout: mocks.logout,
    markMfaEnabled: mocks.markMfaEnabled,
  }),
}));

vi.mock("../../hooks/queries/useEmployeesQuery", () => ({
  useEmployeesQuery: () => ({ data: [] }),
  useClockingEmployeeOptionsQuery: () => ({ data: [] }),
}));

vi.mock("../../hooks/useSystemStatus", () => ({
  useSystemStatus: () => ({ status: "online" }),
}));

vi.mock("../../store/useStore", () => ({
  useStore: (
    selector: (s: { soundEnabled: boolean; setSoundEnabled: (v: boolean) => void }) => unknown,
  ) => selector({ soundEnabled: true, setSoundEnabled: mocks.setSoundEnabled }),
}));

describe("useHeaderController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser = {
      id: "u-admin",
      username: "admin",
      role: "Administrador",
      mfaEnabled: false,
    };
  });

  it("habilita canConfigureMfa solo para Administrador sin MFA habilitado", () => {
    const { result, rerender } = renderHook(() => useHeaderController());
    expect(result.current.canConfigureMfa).toBe(true);

    mocks.currentUser = {
      id: "u-admin",
      username: "admin",
      role: "Administrador",
      mfaEnabled: true,
    };
    rerender();
    expect(result.current.canConfigureMfa).toBe(false);

    mocks.currentUser = {
      id: "u-sup",
      username: "sup",
      role: "Supervisor_Elevado",
      mfaEnabled: false,
    };
    rerender();
    expect(result.current.canConfigureMfa).toBe(false);
  });

  it("abre modal MFA cerrando dropdown y al completar actualiza estado e invalida users", () => {
    const { result } = renderHook(() => useHeaderController());

    act(() => {
      result.current.setIsDropdownOpen(true);
    });
    expect(result.current.isDropdownOpen).toBe(true);

    act(() => {
      result.current.openMfaSetup();
    });
    expect(result.current.isDropdownOpen).toBe(false);
    expect(result.current.isMfaSetupModalOpen).toBe(true);

    act(() => {
      result.current.handleMfaSetupSuccess();
    });
    expect(mocks.markMfaEnabled).toHaveBeenCalledTimes(1);
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["users"] });
    expect(result.current.isMfaSetupModalOpen).toBe(false);
  });

  it("handleLogout delega en logout sin navegacion en carrera", async () => {
    const { result } = renderHook(() => useHeaderController());

    await act(async () => {
      await result.current.handleLogout();
    });

    expect(mocks.logout).toHaveBeenCalledTimes(1);
  });
});
