import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useWorkerPortalData } from "../../../features/worker-portal/hooks/useWorkerPortalData";

const {
  addToastMock,
  punchMutateAsyncMock,
  refreshEmployeesMock,
  downloadReportPDFMock,
  getEmployeeDailyScheduleInfoMock,
  useTimeRecordsMock,
  useUserClockingStatusMock,
  useEmployeesMock,
  getAllEmployeesMock,
} = vi.hoisted(() => ({
  addToastMock: vi.fn(),
  punchMutateAsyncMock: vi.fn(),
  refreshEmployeesMock: vi.fn(),
  downloadReportPDFMock: vi.fn(),
  getEmployeeDailyScheduleInfoMock: vi.fn(),
  useTimeRecordsMock: vi.fn(),
  useUserClockingStatusMock: vi.fn(),
  useEmployeesMock: vi.fn(),
  getAllEmployeesMock: vi.fn(),
}));

const employeeE1 = {
  id: "e1",
  name: "Ana",
  area: "Ops",
  position: "Operador",
  workdayType: "Full",
  status: "Activo",
  lastModified: 0,
  syncStatus: "synced",
  isDeleted: false,
};

const currentUser = {
  id: "u1",
  username: "ana",
  role: "Usuario",
  employeeId: "e1",
  lastModified: 0,
  syncStatus: "synced",
  isDeleted: false,
};

// r3 es de otro empleado y va primero (contaminación cruzada en bug original).
// r1 es el último propio en marzo (en_jornada), r2 es propio pero febrero.
const recordR1 = {
  id: "r1",
  employeeId: "e1",
  date: "2026-03-05",
  entrada: "2026-03-05T12:00:00.000Z",
  entradaTimestamp: 1000,
  clockingStatus: "en_jornada",
  workedHours: 4,
  overtimeHours: 0,
  scheduledHours: 8,
};
const recordR2 = {
  id: "r2",
  employeeId: "e1",
  date: "2026-02-10",
  entrada: "2026-02-10T12:00:00.000Z",
  entradaTimestamp: 500,
  clockingStatus: "terminada",
  workedHours: 8,
  overtimeHours: 0,
  scheduledHours: 8,
};
const recordR3Other = {
  id: "r3",
  employeeId: "e2",
  date: "2026-03-06",
  entrada: "2026-03-06T12:00:00.000Z",
  entradaTimestamp: 2000,
  clockingStatus: "en_colacion",
  workedHours: 2,
  overtimeHours: 0,
  scheduledHours: 8,
};

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => ({ currentUser }),
}));

vi.mock("../../../hooks/useEmployees", () => ({
  useEmployees: (...args: unknown[]) => useEmployeesMock(...args),
}));

vi.mock("../../../hooks/useTimeRecords", () => ({
  useTimeRecords: (...args: unknown[]) => useTimeRecordsMock(...args),
}));

vi.mock("../../../hooks/queries/useTimeRecordsQuery", () => ({
  useTimeRecordMutations: () => ({
    punchMutation: { mutateAsync: punchMutateAsyncMock },
  }),
  useUserClockingStatus: (...args: unknown[]) => useUserClockingStatusMock(...args),
}));

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: addToastMock }),
}));

vi.mock("../../../hooks/useScheduling", () => ({
  useScheduling: () => ({
    requests: [],
    getEmployeeDailyScheduleInfo: getEmployeeDailyScheduleInfoMock,
    isLoadingSchedulingData: false,
  }),
}));

vi.mock("../../../services/employeeService", () => ({
  employeeService: { getAll: (...args: unknown[]) => getAllEmployeesMock(...args) },
}));

vi.mock("../../../services/kpiService", () => ({
  downloadReportPDF: (...args: unknown[]) => downloadReportPDFMock(...args),
}));

vi.mock("../../../hooks/useMediaQuery", () => ({
  useMediaQuery: () => false,
}));

vi.mock("../../../hooks/useBusinessNow", () => ({
  useBusinessNow: () => new Date("2026-03-15T12:00:00.000Z"),
  getBusinessNow: () => new Date("2026-03-15T12:00:00.000Z"),
}));

vi.mock("../../../utils/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), log: vi.fn(), debug: vi.fn() },
}));

describe("useWorkerPortalData (spec 028)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEmployeeDailyScheduleInfoMock.mockReturnValue({
      scheduleText: "08:00 - 16:00",
      isWorkDay: true,
      planningStatus: "Programado",
    });
    punchMutateAsyncMock.mockResolvedValue({ success: true, action: "ENTRADA" });
    downloadReportPDFMock.mockResolvedValue({
      blob: new Blob(["mock"], { type: "application/pdf" }),
      filename: "Reporte_Asistencia.pdf",
    });
    useEmployeesMock.mockReturnValue({
      getEmployeeById: (id: string) => (id === "e1" ? employeeE1 : null),
      allEmployees: [employeeE1],
      isLoadingEmployees: false,
      refreshEmployees: refreshEmployeesMock,
    });
    // Simula la query ya acotada en servidor (empleado + mes).
    useTimeRecordsMock.mockReturnValue({
      allRecordsInDateRange: [recordR3Other, recordR1, recordR2],
    });
    // Último registro propio (acotado por employeeId en servidor).
    useUserClockingStatusMock.mockReturnValue({
      lastRecord: recordR1,
      status: "in",
      time: "",
      isLoading: false,
    });
    getAllEmployeesMock.mockResolvedValue([employeeE1]);
  });

  it("AC2: enrichedRecords filtra por empleado y por selectedMonth", async () => {
    const { result } = renderHook(() => useWorkerPortalData());

    await waitFor(() => {
      expect(result.current.employee?.id).toBe("e1");
    });

    // selectedMonth inicial = 2026-03 (businessNow mockeado)
    expect(result.current.selectedMonth).toBe("2026-03");
    const ids = result.current.enrichedRecords.map((r) => r.id);
    // Solo r1: e1 + marzo. r2 es febrero, r3 es otro empleado.
    expect(ids).toEqual(["r1"]);

    // Cambiar a febrero muestra solo r2
    act(() => {
      result.current.setSelectedMonth("2026-02");
    });
    expect(result.current.enrichedRecords.map((r) => r.id)).toEqual(["r2"]);
  });

  it("AC3: status deriva del último registro propio, no del primero global", async () => {
    const { result } = renderHook(() => useWorkerPortalData());
    // El status viene del último registro del empleado (query acotada por
    // employeeId en servidor): r1 en_jornada, nunca r3 de otro empleado.
    await waitFor(() => {
      expect(result.current.status).toBe("en_jornada");
    });
    expect(result.current.status).not.toBe("en_colacion");
  });

  it("AC-perf: pide records acotados a empleado+mes (no volcado completo)", async () => {
    const { result } = renderHook(() => useWorkerPortalData());
    await waitFor(() => {
      expect(result.current.employee?.id).toBe("e1");
    });

    // businessNow mockeado = 2026-03 -> rango del mes completo.
    expect(useTimeRecordsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { employeeId: "e1", desde: "2026-03-01", hasta: "2026-03-31" },
        enabled: true,
      }),
    );
  });

  it("AC-perf: deshabilita la query si el empleado no se resuelve", async () => {
    useEmployeesMock.mockReturnValue({
      getEmployeeById: () => null,
      allEmployees: [],
      isLoadingEmployees: false,
      refreshEmployees: refreshEmployeesMock,
    });
    getAllEmployeesMock.mockResolvedValue([]);

    const { result } = renderHook(() => useWorkerPortalData());
    await waitFor(() => {
      expect(result.current.isLoadingEmployees).toBe(false);
    });

    expect(result.current.employee).toBeNull();
    const lastCall = useTimeRecordsMock.mock.calls.at(-1)?.[0] as { enabled?: boolean } | undefined;
    expect(lastCall).toMatchObject({ enabled: false });
  });

  it("AC4: colación envía forcedType canónico camel (contrato PunchSchema)", async () => {
    const { result } = renderHook(() => useWorkerPortalData());
    await waitFor(() => {
      expect(result.current.employee?.id).toBe("e1");
    });

    await act(async () => {
      await result.current.handleClockingAction("colacion_inicio");
    });
    expect(punchMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: "e1", forcedType: "inicioColacion" }),
    );

    await act(async () => {
      await result.current.handleClockingAction("colacion_fin");
    });
    expect(punchMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: "e1", forcedType: "finColacion" }),
    );

    await act(async () => {
      await result.current.handleClockingAction("jornada_inicio");
    });
    expect(punchMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({ forcedType: "entrada" }),
    );
  });

  it("AC6: fallo de punch muestra toast de error (no falla silenciosa)", async () => {
    punchMutateAsyncMock.mockRejectedValueOnce(new Error("network down"));
    const { result } = renderHook(() => useWorkerPortalData());
    await waitFor(() => {
      expect(result.current.employee?.id).toBe("e1");
    });

    await act(async () => {
      await result.current.handleClockingAction("jornada_inicio");
    });
    expect(addToastMock).toHaveBeenCalledWith("Error de conexión al registrar marcaje.", "error");
  });

  it("spec030: denegación por licencia muestra el mensaje backend una sola vez", async () => {
    punchMutateAsyncMock.mockRejectedValueOnce(
      new Error(
        "El empleado tiene licencia, vacaciones o permiso aprobado para hoy. Elimine la licencia con un supervisor para poder marcar.",
      ),
    );
    const { result } = renderHook(() => useWorkerPortalData());
    await waitFor(() => {
      expect(result.current.employee?.id).toBe("e1");
    });

    await act(async () => {
      await result.current.handleClockingAction("jornada_inicio");
    });

    // Un único toast con el mensaje de negocio (el onError de la mutación va
    // suprimido con suppressErrorToast).
    expect(addToastMock).toHaveBeenCalledTimes(1);
    expect(addToastMock).toHaveBeenCalledWith(expect.stringMatching(/licencia/i), "error");
    expect(punchMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({ suppressErrorToast: true }),
    );
  });

  it("spec030: doble invocación concurrente dispara un solo punch", async () => {
    let release: (value: unknown) => void = () => {};
    punchMutateAsyncMock.mockImplementationOnce(
      () => new Promise((resolve) => void (release = resolve)),
    );
    const { result } = renderHook(() => useWorkerPortalData());
    await waitFor(() => {
      expect(result.current.employee?.id).toBe("e1");
    });

    let first: Promise<void> | undefined;
    act(() => {
      first = result.current.handleClockingAction("jornada_inicio");
    });
    // Segunda invocación mientras la primera sigue en vuelo: debe ignorarse.
    await act(async () => {
      await result.current.handleClockingAction("jornada_inicio");
    });
    act(() => {
      release({ success: true, action: "ENTRADA" });
    });
    await act(async () => {
      await first;
    });

    expect(punchMutateAsyncMock).toHaveBeenCalledTimes(1);
  });

  it("AC6b: fallo de export PDF muestra toast de error", async () => {
    downloadReportPDFMock.mockRejectedValueOnce(new Error("pdf down"));
    const { result } = renderHook(() => useWorkerPortalData());
    await waitFor(() => {
      expect(result.current.employee?.id).toBe("e1");
    });

    await act(async () => {
      await result.current.handleExportPDF();
    });
    expect(addToastMock).toHaveBeenCalledWith("Error al descargar el PDF", "error");
  });
});
