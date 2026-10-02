import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useShiftCalendarData } from "../../../features/shift-calendar/hooks/useShiftCalendarData";

const {
  addToastMock,
  incrementProcessingMock,
  decrementProcessingMock,
  exportShiftScheduleToICSMock,
  exportCalendarToPDFMock,
  downloadCalendarPDFMock,
} = vi.hoisted(() => ({
  addToastMock: vi.fn(),
  incrementProcessingMock: vi.fn(),
  decrementProcessingMock: vi.fn(),
  exportShiftScheduleToICSMock: vi.fn(),
  exportCalendarToPDFMock: vi.fn(),
  downloadCalendarPDFMock: vi.fn(),
}));

let mockCurrentUser: { role: string; employeeId?: string } | null = { role: "Administrador" };
let mockCalendarData: {
  scheduleMap: Map<string, unknown>;
  isAssignedShiftsLoading: boolean;
  isShiftPatternsLoading: boolean;
  isLoadingCalendar: boolean;
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
    isLoadingEmployees: false,
  }),
}));

vi.mock("../../../hooks/useCalendarData", () => ({
  useCalendarData: () => mockCalendarData,
}));

vi.mock("../../../utils/export/index", () => ({
  exportShiftScheduleToICS: exportShiftScheduleToICSMock,
  exportCalendarToPDF: exportCalendarToPDFMock,
}));

vi.mock("../../../services/exportService", () => ({
  exportService: {
    downloadCalendarPDF: downloadCalendarPDFMock,
  },
}));

describe("useShiftCalendarData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser = { role: "Administrador" };
    mockCalendarData = {
      scheduleMap: new Map(),
      isAssignedShiftsLoading: false,
      isShiftPatternsLoading: false,
      isLoadingCalendar: false,
    };
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
          "2026-03-03",
          {
            type: "employee",
            data: {
              employeeId: "e1",
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
      result.current.handleExportToICS();
    });

    expect(exportShiftScheduleToICSMock).toHaveBeenCalled();
    expect(addToastMock).toHaveBeenCalledWith(
      "Eventos de turno exportados a formato ICS.",
      "success",
    );
  });
});
