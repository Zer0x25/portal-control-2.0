import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authTokenStore } from "../../../services/authToken";
import { useShiftCalendarData } from "../../../features/shift-calendar/hooks/useShiftCalendarData";
import { server } from "../../mocks/server";
import { http, HttpResponse } from "msw";

const {
  addToastMock,
  incrementProcessingMock,
  decrementProcessingMock,
  exportShiftScheduleToICSMock,
  exportCalendarToPDFMock,
} = vi.hoisted(() => ({
  addToastMock: vi.fn(),
  incrementProcessingMock: vi.fn(),
  decrementProcessingMock: vi.fn(),
  exportShiftScheduleToICSMock: vi.fn(),
  exportCalendarToPDFMock: vi.fn(),
}));

let mockCurrentUser: { role: string; employeeId?: string } | null = { role: "Administrador" };
let mockEmployeesError = false;
let mockEmployeesLoading = false;
let mockCalendarData: {
  scheduleMap: Map<string, unknown>;
  isAssignedShiftsLoading: boolean;
  isShiftPatternsLoading: boolean;
  isLoadingCalendar: boolean;
  isCalendarError?: boolean;
} = {
  scheduleMap: new Map(),
  isAssignedShiftsLoading: false,
  isShiftPatternsLoading: false,
  isLoadingCalendar: false,
};

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: addToastMock }),
}));

vi.mock("../../../store/useStore", () => ({
  useStore: (
    selector: (s: { incrementProcessing: () => void; decrementProcessing: () => void }) => unknown,
  ) =>
    selector({
      incrementProcessing: incrementProcessingMock,
      decrementProcessing: decrementProcessingMock,
    }),
}));

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => ({ currentUser: mockCurrentUser }),
}));

vi.mock("../../../hooks/useEmployees", () => ({
  useEmployees: () => ({
    activeEmployees: [
      { id: "e1", name: "Ana Pérez", area: "Operaciones", position: "Operador" },
      { id: "e2", name: "Luis Soto", area: "Bodega", position: "Supervisor" },
    ],
    isLoadingEmployees: mockEmployeesLoading,
    isError: mockEmployeesError,
  }),
}));

vi.mock("../../../hooks/useCalendarData", () => ({
  useCalendarData: () => mockCalendarData,
}));

vi.mock("../../../utils/export/index", () => ({
  exportShiftScheduleToICS: exportShiftScheduleToICSMock,
  exportCalendarToPDF: exportCalendarToPDFMock,
}));

describe("useShiftCalendarData", () => {
  beforeEach(() => {
    authTokenStore.setToken("fixture");
    vi.clearAllMocks();
    exportShiftScheduleToICSMock.mockReturnValue(true);
    exportCalendarToPDFMock.mockReturnValue(true);
    mockCurrentUser = { role: "Administrador" };
    mockEmployeesError = false;
    mockEmployeesLoading = false;
    mockCalendarData = {
      scheduleMap: new Map(),
      isAssignedShiftsLoading: false,
      isShiftPatternsLoading: false,
      isLoadingCalendar: false,
    };
    server.use(
      http.get(
        "http://localhost:4000/api/export/calendar-pdf",
        () =>
          new HttpResponse(new Blob(["mock"], { type: "application/pdf" }), {
            status: 200,
            headers: { "content-disposition": 'attachment; filename="Calendario_Turnos.pdf"' },
          }),
      ),
    );
  });

  afterEach(() => {
    authTokenStore.removeToken();
    server.resetHandlers();
  });

  it("filters employees by area/cargo and resets dependent filters", () => {
    const { result } = renderHook(() => useShiftCalendarData());

    expect(result.current.filteredEmployeesForCalendar).toHaveLength(2);

    act(() => {
      result.current.handleCargoChange({
        target: { value: "Operador" },
      } as React.ChangeEvent<HTMLSelectElement>);
    });
    expect(result.current.selectedCargo).toBe("Operador");

    act(() => {
      result.current.handleAreaChange({
        target: { value: "Operaciones" },
      } as React.ChangeEvent<HTMLSelectElement>);
    });

    expect(result.current.selectedArea).toBe("Operaciones");
    expect(result.current.selectedCargo).toBe("");
    expect(result.current.selectedEmployeeId).toBeNull();
    expect(result.current.filteredEmployeesForCalendar).toHaveLength(1);
    expect(result.current.filteredEmployeesForCalendar[0].id).toBe("e1");
  });

  it("exports ICS in worker mode with selected employee schedule", () => {
    mockCurrentUser = { role: "Usuario", employeeId: "e1" };
    mockCalendarData = {
      scheduleMap: new Map([
        [
          "2026-04-03",
          { type: "employee", data: { isWorkDay: true, startTime: "08:00", endTime: "17:00" } },
        ],
        [
          "2026-03-04",
          { type: "employee", data: { isWorkDay: false, startTime: "08:00", endTime: "17:00" } },
        ],
        [
          "2026-03-03",
          {
            type: "employee",
            data: {
              isWorkDay: true,
              startTime: "08:00",
              endTime: "17:00",
              shiftPatternName: "Turno Día",
            },
          },
        ],
      ]),
      isAssignedShiftsLoading: false,
      isShiftPatternsLoading: false,
      isLoadingCalendar: false,
    };

    const { result } = renderHook(() => useShiftCalendarData());
    act(() => {
      result.current.setDisplayDate(new Date(2026, 2, 3));
    });
    act(() => {
      result.current.handleExportToICS();
    });

    expect(exportShiftScheduleToICSMock).toHaveBeenCalledWith(
      [expect.objectContaining({ date: "2026-03-03", startTime: "08:00" })],
      expect.any(Object),
    );
    expect(addToastMock).toHaveBeenCalledWith(
      "Eventos de turno exportados a formato ICS.",
      "success",
    );
  });
  it("reports empty exports and blocked print without success", async () => {
    mockCurrentUser = { role: "Usuario", employeeId: "e1" };
    exportShiftScheduleToICSMock.mockReturnValue(false);
    exportCalendarToPDFMock.mockReturnValue(false);
    const { result } = renderHook(() => useShiftCalendarData());
    act(() => result.current.handleExportToICS());
    await act(async () => result.current.handleExportToPDF());
    expect(addToastMock).toHaveBeenCalledWith(
      "No hay turnos exportables en el período visible.",
      "warning",
    );
    expect(addToastMock).toHaveBeenCalledWith(expect.stringContaining("bloqueó"), "warning");
    expect(addToastMock).not.toHaveBeenCalledWith(expect.any(String), "success");
  });
  it("escapes calendar data and restricts colors in print markup", async () => {
    mockCurrentUser = { role: "Usuario", employeeId: "e1" };
    mockCalendarData.scheduleMap = new Map([
      [
        "2026-03-03",
        {
          type: "employee",
          data: {
            isWorkDay: true,
            shiftPatternName: '<b id="probe">X</b>',
            patternColor: 'red" onmouseover="x',
            startTime: "08:00",
            endTime: "17:00",
          },
        },
      ],
    ]);
    const { result } = renderHook(() => useShiftCalendarData());
    act(() => result.current.setDisplayDate(new Date(2026, 2, 3)));
    await act(async () => result.current.handleExportToPDF());
    const renderCell = exportCalendarToPDFMock.mock.calls[0][5] as (date: Date) => string;
    const html = renderCell(new Date("2026-03-03T00:00:00Z"));
    expect(html).toContain("&lt;b id=&quot;probe&quot;&gt;X&lt;/b&gt;");
    expect(html).toContain("#4b5563");
    expect(html).not.toContain("onmouseover");
  });
  it.each([
    {
      isLoadingCalendar: true,
      isCalendarError: false,
      message: "Espere a que termine la carga del calendario.",
      level: "warning",
    },
    {
      isLoadingCalendar: false,
      isCalendarError: true,
      message: "No se pudo cargar el calendario. Reintente antes de exportar.",
      level: "error",
    },
  ])(
    "blocks all exports when calendar is unavailable: $level",
    async ({ isLoadingCalendar, isCalendarError, message, level }) => {
      mockCurrentUser = { role: "Usuario", employeeId: "e1" };
      mockCalendarData.isLoadingCalendar = isLoadingCalendar;
      mockCalendarData.isCalendarError = isCalendarError;
      let pdfRequests = 0;
      server.use(
        http.get("http://localhost:4000/api/export/calendar-pdf", () => {
          pdfRequests++;
          return new HttpResponse(null, { status: 500 });
        }),
      );
      const { result } = renderHook(() => useShiftCalendarData());
      act(() => result.current.handleExportToICS());
      await act(async () => result.current.handleExportToPDF());
      await act(async () => result.current.handleDownloadBackendPDF());
      expect(exportShiftScheduleToICSMock).not.toHaveBeenCalled();
      expect(exportCalendarToPDFMock).not.toHaveBeenCalled();
      expect(pdfRequests).toBe(0);
      expect(addToastMock).toHaveBeenCalledTimes(3);
      expect(addToastMock).toHaveBeenCalledWith(message, level);
      expect(addToastMock).not.toHaveBeenCalledWith(expect.any(String), "success");
    },
  );
  it.each([
    { loading: true, error: false, message: "Espere a que termine la carga del calendario." },
    {
      loading: false,
      error: true,
      message: "No se pudo cargar el calendario. Reintente antes de exportar.",
    },
  ])("blocks all exports when employees are unavailable", async ({ loading, error, message }) => {
    mockCurrentUser = { role: "Usuario", employeeId: "e1" };
    mockEmployeesLoading = loading;
    mockEmployeesError = error;
    const { result } = renderHook(() => useShiftCalendarData());
    act(() => result.current.handleExportToICS());
    await act(async () => result.current.handleExportToPDF());
    await act(async () => result.current.handleDownloadBackendPDF());
    expect(exportShiftScheduleToICSMock).not.toHaveBeenCalled();
    expect(exportCalendarToPDFMock).not.toHaveBeenCalled();
    expect(addToastMock).toHaveBeenCalledTimes(3);
    expect(addToastMock).toHaveBeenCalledWith(message, error ? "error" : "warning");
  });
});
