import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useGovernanceData } from "../../../features/governance/hooks/useGovernanceData";
import { ROLES } from "../../../utils/mappings";

const setSearchParamsMock = vi.fn();
let currentSearchParams = new URLSearchParams();
let currentRole: string = ROLES.ADMIN;

vi.mock("react-router", () => ({
  useSearchParams: () => [currentSearchParams, setSearchParamsMock],
}));

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => ({
    currentUser: { id: "u1", username: "test", role: currentRole },
  }),
}));

describe("useGovernanceData", () => {
  beforeEach(() => {
    setSearchParamsMock.mockReset();
    currentSearchParams = new URLSearchParams();
    currentRole = ROLES.ADMIN;
  });

  it("uses default tab when query param is missing/invalid", () => {
    const { result } = renderHook(() => useGovernanceData());
    expect(result.current.activeTab).toBe("integrity");
    expect(result.current.allowedTabs).toEqual([
      "integrity",
      "security",
      "audit",
      "system",
      "health",
    ]);
  });

  it("reads tab from query param when valid for Super_Administrador", () => {
    currentSearchParams = new URLSearchParams("tab=security");
    const { result } = renderHook(() => useGovernanceData());
    expect(result.current.activeTab).toBe("security");
  });

  it("normalizes disallowed tabs to integrity for Administrador and Fiscalizador", () => {
    currentRole = ROLES.SUPERVISOR_ELEVATED;
    currentSearchParams = new URLSearchParams("tab=security");
    const { result } = renderHook(() => useGovernanceData());
    expect(result.current.activeTab).toBe("integrity");
    expect(result.current.allowedTabs).toEqual(["integrity", "audit", "health"]);
    expect(setSearchParamsMock).toHaveBeenCalledWith({ tab: "integrity" }, { replace: true });

    setSearchParamsMock.mockReset();
    currentRole = ROLES.AUDITOR;
    currentSearchParams = new URLSearchParams("tab=system");
    const auditorHook = renderHook(() => useGovernanceData());
    expect(auditorHook.result.current.activeTab).toBe("integrity");
    expect(auditorHook.result.current.allowedTabs).toEqual(["integrity", "audit", "health"]);
    expect(setSearchParamsMock).toHaveBeenCalledWith({ tab: "integrity" }, { replace: true });
  });

  it("updates active tab and search params on handleTabChange", () => {
    const { result } = renderHook(() => useGovernanceData());

    act(() => {
      result.current.handleTabChange("audit");
    });

    expect(result.current.activeTab).toBe("audit");
    expect(setSearchParamsMock).toHaveBeenCalledWith({ tab: "audit" });
  });
});
