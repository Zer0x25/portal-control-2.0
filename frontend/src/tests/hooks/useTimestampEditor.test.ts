import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toDate } from "date-fns-tz";
import { useTimestampEditor } from "../../hooks/useTimestampEditor";

const { mutateAsyncMock, closeEditTimestampModalMock, addToastMock, storeState } = vi.hoisted(
  () => ({
    mutateAsyncMock: vi.fn(),
    closeEditTimestampModalMock: vi.fn(),
    addToastMock: vi.fn(),
    storeState: {
      editingRecordInfo: {
        record: {
          id: "r1",
          employeeId: "e1",
          employeeName: "Ana",
          date: "2026-03-01",
          entrada: "2026-03-01T08:00:00.000Z",
          status: "AnomaliaManual",
        },
        field: "entrada" as "entrada" | "salida",
      },
      newTimestampValue: "08:30",
    },
  }),
);

vi.mock("../../hooks/queries/useTimeRecordsQuery", () => ({
  useTimeRecordMutations: () => ({
    updateRecordMutation: {
      mutateAsync: mutateAsyncMock,
      isPending: false,
    },
  }),
}));

vi.mock("../../hooks/useToasts", () => ({
  useToasts: () => ({
    addToast: addToastMock,
  }),
}));

vi.mock("../../store/useStore", () => ({
  useStore: (
    selector: (s: {
      editingRecordInfo: typeof storeState.editingRecordInfo;
      newTimestampValue: string;
      closeEditTimestampModal: typeof closeEditTimestampModalMock;
    }) => unknown,
  ) =>
    selector({
      editingRecordInfo: storeState.editingRecordInfo,
      newTimestampValue: storeState.newTimestampValue,
      closeEditTimestampModal: closeEditTimestampModalMock,
    }),
}));

describe("useTimestampEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsyncMock.mockResolvedValue({});
    storeState.editingRecordInfo = {
      record: {
        id: "r1",
        employeeId: "e1",
        employeeName: "Ana",
        date: "2026-03-01",
        entrada: "2026-03-01T08:00:00.000Z",
        status: "AnomaliaManual",
      },
      field: "entrada",
    };
    storeState.newTimestampValue = "08:30";
  });

  it("keeps the record date fixed and persists exactly once", async () => {
    const { result } = renderHook(() => useTimestampEditor());

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
    const payload = mutateAsyncMock.mock.calls[0][0] as { entrada: string; date: string };
    expect(payload.date).toBe("2026-03-01");
    expect(payload.entrada).toBe(
      toDate("2026-03-01T08:30:00", { timeZone: "America/Santiago" }).toISOString(),
    );
    expect(closeEditTimestampModalMock).toHaveBeenCalledTimes(1);
  });

  it("delegates hard salida validation to backend", async () => {
    storeState.editingRecordInfo = {
      record: {
        id: "r1",
        employeeId: "e1",
        employeeName: "Ana",
        date: "2026-03-01",
        entrada: "2026-03-01T08:00:00.000Z",
        status: "AnomaliaManual",
      },
      field: "salida",
    };
    storeState.newTimestampValue = "21:00";
    mutateAsyncMock.mockRejectedValueOnce(
      new Error("La hora de salida no puede superar 12 horas desde la entrada."),
    );

    const { result } = renderHook(() => useTimestampEditor());

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
    const payload = mutateAsyncMock.mock.calls[0][0] as { salida: string };
    expect(payload.salida).toBe(
      toDate("2026-03-01T21:00:00", { timeZone: "America/Santiago" }).toISOString(),
    );
    expect(addToastMock).not.toHaveBeenCalled();
    expect(closeEditTimestampModalMock).not.toHaveBeenCalled();
  });

  it("allows overnight salida until 12h from entrada (e.g. 20:00 -> 08:00 next day)", async () => {
    storeState.editingRecordInfo = {
      record: {
        id: "r1",
        employeeId: "e1",
        employeeName: "Ana",
        date: "2026-03-01",
        entrada: toDate("2026-03-01T20:00:00", { timeZone: "America/Santiago" }).toISOString(),
        status: "AnomaliaManual",
      },
      field: "salida",
    };
    storeState.newTimestampValue = "08:00";

    const { result } = renderHook(() => useTimestampEditor());

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
    const payload = mutateAsyncMock.mock.calls[0][0] as { salida: string };
    expect(payload.salida).toBe(
      toDate("2026-03-02T08:00:00", { timeZone: "America/Santiago" }).toISOString(),
    );
    expect(closeEditTimestampModalMock).toHaveBeenCalledTimes(1);
  });
});
