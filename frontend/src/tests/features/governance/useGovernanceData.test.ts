import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useGovernanceData } from "../../../features/governance/hooks/useGovernanceData";

const setSearchParamsMock = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock("react-router", () => ({
  useSearchParams: () => [currentSearchParams, setSearchParamsMock],
}));

describe("useGovernanceData", () => {
  beforeEach(() => {
    setSearchParamsMock.mockReset();
    currentSearchParams = new URLSearchParams();
  });

  it("uses default tab when query param is missing/invalid", () => {
    const { result } = renderHook(() => useGovernanceData());
    expect(result.current.activeTab).toBe("integrity");
  });

  it("reads tab from query param when valid", () => {
    currentSearchParams = new URLSearchParams("tab=security");
    const { result } = renderHook(() => useGovernanceData());
    expect(result.current.activeTab).toBe("security");
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
