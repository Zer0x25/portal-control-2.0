import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useConfigurationData } from "../../../features/configuration/hooks/useConfigurationData";

const setSearchParamsMock = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock("react-router", () => ({
  useSearchParams: () => [currentSearchParams, setSearchParamsMock],
}));

describe("useConfigurationData", () => {
  beforeEach(() => {
    setSearchParamsMock.mockReset();
    currentSearchParams = new URLSearchParams();
  });

  it("uses default tab when query param is missing/invalid", () => {
    const { result } = renderHook(() => useConfigurationData());
    expect(result.current.activeTab).toBe("variables");
  });

  it("reads tab from query param when valid", () => {
    currentSearchParams = new URLSearchParams("tab=email");
    const { result } = renderHook(() => useConfigurationData());
    expect(result.current.activeTab).toBe("email");
  });

  it("updates active tab and search params on handleTabChange", () => {
    const { result } = renderHook(() => useConfigurationData());

    act(() => {
      result.current.handleTabChange("master-data");
    });

    expect(result.current.activeTab).toBe("master-data");
    expect(setSearchParamsMock).toHaveBeenCalledWith({ tab: "master-data" });
  });
});
