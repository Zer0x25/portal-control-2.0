import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTimeControlModals } from "../../../features/time-control/hooks/useTimeControlModals";

const {
  addToastMock,
  closeQuickActionModalMock,
  openEditTimestampModalMock,
  mutateDeleteAsyncMock,
  mutateResolveAsyncMock,
} = vi.hoisted(() => ({
  addToastMock: vi.fn(),
  closeQuickActionModalMock: vi.fn(),
  openEditTimestampModalMock: vi.fn(),
  mutateDeleteAsyncMock: vi.fn(),
  mutateResolveAsyncMock: vi.fn(),
}));

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: addToastMock }),
}));

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => ({
    currentUser: {
      id: "u1",
      username: "admin",
      role: "Administrador",
      lastModified: 0,
      syncStatus: "synced",
      isDeleted: false,
    },
  }),
}));

vi.mock("../../../store/useStore", () => ({
  useStore: (
    selector: (s: {
      openEditTimestampModal: typeof openEditTimestampModalMock;
      closeQuickActionModal: typeof closeQuickActionModalMock;
    }) => unknown,
  ) =>
    selector({
      openEditTimestampModal: openEditTimestampModalMock,
      closeQuickActionModal: closeQuickActionModalMock,
    }),
}));

vi.mock("../../../hooks/queries/useTimeRecordsQuery", () => ({
  useTimeRecordMutations: () => ({
    deleteRecordMutation: { mutateAsync: mutateDeleteAsyncMock },
    resolveAnomalyMutation: { mutateAsync: mutateResolveAsyncMock, isPending: false },
  }),
}));

vi.mock("../../../hooks/queries/useConfigQuery", () => ({
  useAccountingLockDateQuery: () => ({ data: "2026-03-01" }),
}));

vi.mock("../../../hooks/queries/useReportsQuery", () => ({
  useReportsQuery: () => ({
    data: [
      {
        id: "r1",
        folio: "100",
        date: "2026-03-03",
        shiftName: "Turno Día",
        responsibleUser: "admin",
        startTime: "2026-03-03T08:00:00.000Z",
        status: "open",
        logEntries: [],
        supplierEntries: [],
        reportCreatedAt: "2026-03-03T08:00:00.000Z",
        updatedAt: "2026-03-03T08:00:00.000Z",
        lastModified: 0,
        syncStatus: "synced",
        isDeleted: false,
      },
    ],
  }),
}));

describe("useTimeControlModals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks delete/comment on records before accounting lock date", () => {
    const { result } = renderHook(() => useTimeControlModals());

    const blockedRecord = {
      id: "t1",
      employeeName: "Ana",
      employeeId: "e1",
      date: "2026-02-20",
      entrada: "2026-02-20T08:00:00.000Z",
    };

    act(() => {
      result.current.handleDeleteClick(blockedRecord as never);
    });
    expect(addToastMock).toHaveBeenCalledWith(
      "Este registro está bloqueado por cierre contable y no puede ser eliminado.",
      "error",
    );

    act(() => {
      result.current.handleAddCommentClick(blockedRecord as never);
    });
    expect(addToastMock).toHaveBeenCalledWith(
      "No se pueden agregar comentarios a registros bloqueados.",
      "warning",
    );
  });

  it("opens novelty flow and resolves anomalies", async () => {
    const { result } = renderHook(() => useTimeControlModals());

    const editableRecord = {
      id: "t2",
      employeeName: "Luis",
      employeeId: "e2",
      date: "2026-03-03",
      entrada: "2026-03-03T08:00:00.000Z",
    };

    act(() => {
      result.current.handleAddCommentClick(editableRecord as never);
    });

    expect(result.current.isAddNoveltyModalOpen).toBe(true);
    expect(result.current.noveltyInitialText).toContain("Novedad sobre Luis");
    expect(closeQuickActionModalMock).toHaveBeenCalled();

    act(() => {
      result.current.handleResolveAnomalyClick({ id: "t2" } as never);
    });
    expect(result.current.isResolutionModalOpen).toBe(true);

    await act(async () => {
      await result.current.handleConfirmResolution("t2", "SHIFT_HOURS_ACK");
    });
    expect(mutateResolveAsyncMock).toHaveBeenCalledWith({
      id: "t2",
      resolution: "SHIFT_HOURS_ACK",
    });
  });
});
