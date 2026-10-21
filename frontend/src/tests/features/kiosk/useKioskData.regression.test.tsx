import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authTokenStore } from "../../../services/authToken";
import { useKioskData } from "../../../features/kiosk/hooks/useKioskData";
import { server } from "../../mocks/server";
import { http, HttpResponse } from "msw";

const { addToastMock, punchMutateAsyncMock, geolocationMock, loggerErrorMock } = vi.hoisted(() => ({
  addToastMock: vi.fn(),
  punchMutateAsyncMock: vi.fn(),
  geolocationMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}));

const employeeK1 = {
  id: "k1",
  name: "Kiosko Uno",
  area: "Ops",
  position: "Operador",
  workdayType: "Full",
  status: "Activo",
  rut: "12.345.678-5",
  isPinBlocked: false,
};

vi.mock("react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("../../../hooks/useEmployees", () => ({
  useEmployees: () => ({
    activeEmployees: [employeeK1],
    isLoadingEmployees: false,
    updateEmployee: vi.fn(async () => true),
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

vi.mock("../../../utils/geolocation", () => ({
  getCurrentGeolocation: (...args: unknown[]) => geolocationMock(...args),
}));

vi.mock("../../../utils/logger", () => ({
  logger: {
    error: (...args: unknown[]) => loggerErrorMock(...args),
    warn: vi.fn(),
    info: vi.fn(),
    log: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("../../../utils/indexedDB", () => ({
  STORES: { DAILY_TIME_RECORDS: "dailyTimeRecords" },
  idbGetAllBy: vi.fn(async () => []),
}));

describe("useKioskData (spec 029)", () => {
  beforeEach(() => {
    authTokenStore.setToken("fixture");
    vi.clearAllMocks();
    geolocationMock.mockResolvedValue({ latitude: -33.4, longitude: -70.6 });
    punchMutateAsyncMock.mockResolvedValue({ success: true, action: "ENTRADA" });
    server.use(
      http.post("http://localhost:4000/api/auth/kiosk-login", () =>
        HttpResponse.json({ success: true, message: "ok" }),
      ),
      http.get("http://localhost:4000/api/records", () =>
        HttpResponse.json({ data: [], total: 0, page: 1, totalPages: 1 }),
      ),
    );
  });

  afterEach(() => {
    authTokenStore.removeToken();
    server.resetHandlers();
  });

  it("auditoria v8.31.2: la entrada por teclado del RUT normaliza los puntos del rut almacenado", async () => {
    const { result } = renderHook(() => useKioskData());

    act(() => {
      result.current.setRutInput("123456785");
    });
    act(() => {
      result.current.handleRutConfirm();
    });

    await waitFor(() => {
      expect(result.current.selectedEmployee?.id).toBe("k1");
    });
  });

  it("AC1: reenvía latitude/longitude al marcar inicio de jornada", async () => {
    const { result } = renderHook(() => useKioskData());

    act(() => {
      result.current.handleEmployeeSelect(employeeK1 as never);
    });
    await waitFor(() => {
      expect(result.current.selectedEmployee?.id).toBe("k1");
    });

    await act(async () => {
      await result.current.handleClockingAction("jornada_inicio");
    });

    expect(geolocationMock).toHaveBeenCalled();
    expect(punchMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: "k1",
        forcedType: "entrada",
        latitude: -33.4,
        longitude: -70.6,
        suppressErrorToast: true,
      }),
    );
  });

  it("AC1b: sin posición igual marca (sin coords) y avisa éxito", async () => {
    geolocationMock.mockResolvedValue(null);
    const { result } = renderHook(() => useKioskData());

    act(() => {
      result.current.handleEmployeeSelect(employeeK1 as never);
    });
    await waitFor(() => {
      expect(result.current.selectedEmployee?.id).toBe("k1");
    });

    await act(async () => {
      await result.current.handleClockingAction("jornada_inicio");
    });

    expect(punchMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: "k1", forcedType: "entrada" }),
    );
    const lastCall = punchMutateAsyncMock.mock.calls[punchMutateAsyncMock.mock.calls.length - 1][0];
    expect(lastCall).not.toHaveProperty("latitude");
    expect(addToastMock).toHaveBeenCalledWith("Registro guardado.", "success");
    expect(result.current.step).toBe("success");
  });

  it("AC2: fallo de punch muestra toast y usa logger (no console.error)", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    punchMutateAsyncMock.mockRejectedValueOnce(new Error("network down"));
    const { result } = renderHook(() => useKioskData());

    act(() => {
      result.current.handleEmployeeSelect(employeeK1 as never);
    });
    await waitFor(() => {
      expect(result.current.selectedEmployee?.id).toBe("k1");
    });

    await act(async () => {
      await result.current.handleClockingAction("jornada_inicio");
    });

    expect(addToastMock).toHaveBeenCalledWith(expect.stringMatching(/error/i), "error");
    expect(loggerErrorMock).toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("AC7: denegación por licencia muestra el mensaje del backend", async () => {
    punchMutateAsyncMock.mockRejectedValueOnce(
      new Error(
        "El empleado tiene licencia, vacaciones o permiso aprobado para hoy. Elimine la licencia con un supervisor para poder marcar.",
      ),
    );
    const { result } = renderHook(() => useKioskData());

    act(() => {
      result.current.handleEmployeeSelect(employeeK1 as never);
    });
    await waitFor(() => {
      expect(result.current.selectedEmployee?.id).toBe("k1");
    });

    await act(async () => {
      await result.current.handleClockingAction("jornada_inicio");
    });

    expect(addToastMock).toHaveBeenCalledWith(expect.stringMatching(/licencia/i), "error");
  });
});
