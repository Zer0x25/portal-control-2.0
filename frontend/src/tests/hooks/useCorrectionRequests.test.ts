import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCorrectionRequests } from "../../hooks/useCorrectionRequests";

const mocks = vi.hoisted(() => ({ refetch: vi.fn() }));
vi.mock("../../hooks/useScheduling", () => ({
  useScheduling: () => ({
    isLoadingSchedulingData: false,
    isLoadingCorrectionRequests: true,
    isErrorCorrectionRequests: true,
    refetchCorrectionRequests: mocks.refetch,
  }),
}));

describe("useCorrectionRequests", () => {
  it("expone el estado de la consulta de solicitudes y su reintento", () => {
    const { result } = renderHook(() => useCorrectionRequests("pending"));
    expect(result.current.isLoadingRequests).toBe(true);
    expect(result.current.isErrorRequests).toBe(true);
    expect(result.current.refetchRequests).toBe(mocks.refetch);
  });
});
