import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useMonthlyPlanningData } from "../../../features/planning/hooks/useMonthlyPlanningData";

describe("useMonthlyPlanningData", () => {
  it("returns default planning metadata", () => {
    const { result } = renderHook(() => useMonthlyPlanningData());

    expect(result.current.title).toBe("Planificación Mensual");
    expect(result.current.subtitle).toBe("Gestión estratégica de turnos y dotación");
    expect(result.current.isEmbedded).toBeUndefined();
  });

  it("preserves isEmbedded input", () => {
    const { result } = renderHook(() => useMonthlyPlanningData({ isEmbedded: true }));
    expect(result.current.isEmbedded).toBe(true);
  });
});
