import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAllPendingCorrectionRequests } from "../../hooks/queries/useAllPendingCorrectionRequestsQuery";
import type { CorrectionRequest } from "../../types";

const { getAllMock } = vi.hoisted(() => ({ getAllMock: vi.fn() }));

vi.mock("../../services/correctionService", () => ({
  correctionService: { getAll: getAllMock },
}));

const makeRequest = (index: number): CorrectionRequest => ({
  id: `request-${index}`,
  employeeId: "employee-1",
  timeRecordId: `record-${index}`,
  recordField: "entrada",
  originalValue: "2026-03-01T12:00:00.000Z",
  requestedValue: "2026-03-01T13:00:00.000Z",
  reason: "Olvidé marcar",
  status: "pending",
  createdAt: index,
  lastModified: index,
  syncStatus: "synced",
  isDeleted: false,
});

describe("fetchAllPendingCorrectionRequests", () => {
  beforeEach(() => vi.clearAllMocks());

  it("AC1: lee todas las pendientes en una sola respuesta y evita omisiones por cambios entre páginas", async () => {
    const pendingRequests = Array.from({ length: 31 }, (_, index) => makeRequest(index));
    const rejectedRequest = { ...makeRequest(31), status: "rejected" as const };
    getAllMock.mockResolvedValueOnce({
      requests: [...pendingRequests, rejectedRequest],
      total: 32,
    });

    const requests = await fetchAllPendingCorrectionRequests();

    expect(requests).toHaveLength(31);
    expect(requests.at(-1)?.id).toBe("request-30");
    expect(getAllMock).toHaveBeenCalledOnce();
    expect(getAllMock).toHaveBeenCalledWith({ status: "pending" });
  });
});
