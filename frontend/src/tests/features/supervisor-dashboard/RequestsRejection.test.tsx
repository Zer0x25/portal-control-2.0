import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRequestsTabController } from "../../../features/supervisor-dashboard/hooks/useRequestsTabController";
import type { CorrectionRequest } from "../../../types";

const mocks = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock("../../../hooks/useCorrectionRequests", () => ({
  useCorrectionRequests: () => ({ requests: [], updateRequestStatus: mocks.update }),
}));
vi.mock("../../../hooks/queries/useCorrectionRequestsStatsQuery", () => ({
  useCorrectionRequestsStatsQuery: () => ({ data: undefined }),
}));
vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => ({ currentUser: { username: "admin" } }),
}));
vi.mock("../../../hooks/useEmployees", () => ({
  useEmployees: () => ({ getEmployeeById: vi.fn() }),
}));

describe("rechazo de solicitudes", () => {
  beforeEach(() => mocks.update.mockReset());

  it("conserva la solicitud al fallar y permite reintentar hasta completar el rechazo", async () => {
    mocks.update.mockRejectedValueOnce(new Error("Sin conexión")).mockResolvedValueOnce(undefined);
    const request = { id: "request-1" } as CorrectionRequest;
    const { result } = renderHook(() => useRequestsTabController());
    act(() => result.current.handleReject(request));

    await act(async () => result.current.handleConfirmReject("Datos incompletos"));
    expect(result.current.requestToReject).toBe(request);
    expect(result.current.processingIds.has(request.id)).toBe(false);

    await act(async () => result.current.handleConfirmReject("Datos incompletos"));
    await waitFor(() => expect(result.current.requestToReject).toBeNull());
    expect(mocks.update).toHaveBeenCalledTimes(2);
    expect(mocks.update).toHaveBeenLastCalledWith({
      id: "request-1",
      status: "rejected",
      resolvedBy: "admin",
      rejectionReason: "Datos incompletos",
    });
  });
});
