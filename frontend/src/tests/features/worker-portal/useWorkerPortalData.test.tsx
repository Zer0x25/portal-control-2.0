import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useWorkerPortalData } from "../../../features/worker-portal/hooks/useWorkerPortalData";

const {
  addToastMock,
  punchMutateAsyncMock,
  refreshEmployeesMock,
  downloadReportPDFMock,
  getEmployeeDailyScheduleInfoMock,
} = vi.hoisted(() => ({
  addToastMock: vi.fn(),
  punchMutateAsyncMock: vi.fn(),
  refreshEmployeesMock: vi.fn(),
  downloadReportPDFMock: vi.fn(),
  getEmployeeDailyScheduleInfoMock: vi.fn(),
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
  useEmployees: () => ({
    getEmployeeById: (id: string) => (id === "e1" ? employeeE1 : null),
    allEmployees: [employeeE1],
    isLoadingEmployees: false,
    refreshEmployees: refreshEmployeesMock,
  }),
}));

vi.mock("../../../hooks/useTimeRecords", () => ({
  useTimeRecords: () => ({
    timeRecordsPage: [recordR3Other, recordR1, recordR2],
    allRecordsInDateRange: [recordR3Other, recordR1, recordR2],
  }),
}));

vi.mock("../../../hooks/queries/useTimeRecordsQuery", () => ({
  useTimeRecordMutations: () => ({
    punchMutation: { mutateAsync: punchMutateAsyncMock },
  }),
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
  employeeService: { getAll: vi.fn(async () => [employeeE1]) },
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
    downloadReportPDFMock.mockResolvedValue(undefined);
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
    // Bug original: tomaba recordR3Other (en_colacion) por ser [0] global.
    await waitFor(() => {
      expect(result.current.status).toBe("en_jornada");
    });
    expect(result.current.status).not.toBe("en_colacion");
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
