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
    },
  }),
);

/** Evento de envio falso: la vista llama al `onSubmit` que entrega la capa. */
const SUBMIT_EVENT = { preventDefault: () => {} };

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
      closeEditTimestampModal: typeof closeEditTimestampModalMock;
    }) => unknown,
  ) =>
    selector({
      editingRecordInfo: storeState.editingRecordInfo,
      closeEditTimestampModal: closeEditTimestampModalMock,
    }),
}));

/**
 * Spec 036 T12c (AC1, AC2, T13): el borrador de hora ya no vive en el store
 * (`newTimestampValue`): el hook es propietario del formulario. Lo que se fija
 * aqui es lo que la migracion puede romper:
 *
 * 1. **El payload**: sigue construyendose el registro completo con la hora
 *    convertida a timestamp de Chile (T13).
 * 2. **La regla `HH:mm`** vive en `editTimestampFormSchema`, no en un regex
 *    dentro de `handleSave`.
 * 3. El borrador arranca en la hora del marcaje (el valor inicial que antes
 *    calculaba `openEditTimestampModal`).
 */
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
  });

  it("arranca con la hora del marcaje (valor inicial del borrador)", () => {
    const { result } = renderHook(() => useTimestampEditor());

    // La entrada es 08:00 UTC = 05:00 en Chile (UTC-3 en marzo).
    expect(result.current.value).toBe("05:00");
    expect(result.current.error).toBeUndefined();
  });

  it("keeps the record date fixed and persists exactly once", async () => {
    const { result } = renderHook(() => useTimestampEditor());

    act(() => {
      result.current.setValue("08:30");
    });
    await act(async () => {
      result.current.formProps.onSubmit(SUBMIT_EVENT);
    });

    await vi.waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
    });
    const payload = mutateAsyncMock.mock.calls[0][0] as { entrada: string; date: string };
    expect(payload.date).toBe("2026-03-01");
    expect(payload.entrada).toBe(
      toDate("2026-03-01T08:30:00", { timeZone: "America/Santiago" }).toISOString(),
    );
    expect(closeEditTimestampModalMock).toHaveBeenCalledTimes(1);
  });

  it("senala la hora vacia y no toca el backend", async () => {
    const { result } = renderHook(() => useTimestampEditor());

    act(() => {
      result.current.setValue("");
    });
    await act(async () => {
      result.current.formProps.onSubmit(SUBMIT_EVENT);
    });

    await vi.waitFor(() => {
      // `ERROR_MESSAGES.required` es generico en genero (mismo patron que
      // `businessDate("La fecha")` en todo el producto).
      expect(result.current.error).toBe("La hora es obligatorio.");
    });
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    expect(closeEditTimestampModalMock).not.toHaveBeenCalled();
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
    mutateAsyncMock.mockRejectedValueOnce(
      new Error("La hora de salida no puede superar 12 horas desde la entrada."),
    );

    const { result } = renderHook(() => useTimestampEditor());

    act(() => {
      result.current.setValue("21:00");
    });
    await act(async () => {
      result.current.formProps.onSubmit(SUBMIT_EVENT);
    });

    await vi.waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
    });
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

    const { result } = renderHook(() => useTimestampEditor());

    act(() => {
      result.current.setValue("08:00");
    });
    await act(async () => {
      result.current.formProps.onSubmit(SUBMIT_EVENT);
    });

    await vi.waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
    });
    const payload = mutateAsyncMock.mock.calls[0][0] as { salida: string };
    expect(payload.salida).toBe(
      toDate("2026-03-02T08:00:00", { timeZone: "America/Santiago" }).toISOString(),
    );
    expect(closeEditTimestampModalMock).toHaveBeenCalledTimes(1);
  });
});
