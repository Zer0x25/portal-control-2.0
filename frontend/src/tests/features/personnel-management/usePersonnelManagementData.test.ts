import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  usePersonnelManagementData,
  ActivePersonnelTab,
} from "../../../features/personnel-management/hooks/usePersonnelManagementData";

describe("usePersonnelManagementData", () => {
  it("uses employees as default tab", () => {
    const { result } = renderHook(() => usePersonnelManagementData());
    expect(result.current.activeTab).toBe("employees");
  });

  it("uses provided defaultTab and reacts to defaultTab changes", () => {
    interface Props {
      defaultTab: ActivePersonnelTab;
    }
    const { result, rerender } = renderHook(
      ({ defaultTab }: Props) => usePersonnelManagementData({ defaultTab }),
      { initialProps: { defaultTab: "users" as ActivePersonnelTab } },
    );

    expect(result.current.activeTab).toBe("users");

    rerender({ defaultTab: "employees" as ActivePersonnelTab });
    expect(result.current.activeTab).toBe("employees");
  });
});
