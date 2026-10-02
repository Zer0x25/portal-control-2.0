import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ShiftCalendarFeatureView } from "../../../features/shift-calendar/views/ShiftCalendar.view";

vi.mock("../../../components/ui/ShiftCalendarView", () => ({
  default: () => <div>SHIFT-CALENDAR-GRID</div>,
}));

vi.mock("../../../components/ui/CalendarMonthSelector", () => ({
  default: () => <div>MONTH-SELECTOR</div>,
}));

describe("ShiftCalendarFeatureView", () => {
  const baseProps: React.ComponentProps<typeof ShiftCalendarFeatureView> = {
    isWorker: false,
    isLoadingEmployees: false,
    displayDate: new Date("2026-03-03T00:00:00Z"),
    viewMode: "month",
    selectedArea: "",
    selectedCargo: "",
    selectedEmployeeId: "e1",
    isDownloading: false,
    isPrinting: false,
    filteredEmployeesForCalendar: [
      {
        id: "e1",
        name: "Ana Pérez",
      },
    ],
    isAssignedShiftsLoading: false,
    isShiftPatternsLoading: false,
    scheduleMap: new Map(),
    isLoadingCalendar: false,
    uniqueAreas: ["Operaciones"],
    uniqueCargosInArea: ["Operador"],
    setDisplayDate: vi.fn(),
    setViewMode: vi.fn(),
    setSelectedEmployeeId: vi.fn(),
    handlePrev: vi.fn(),
    handleNext: vi.fn(),
    handleAreaChange: vi.fn(),
    handleCargoChange: vi.fn(),
    handleDayDoubleClick: vi.fn(),
    handleExportToPDF: vi.fn(),
    handleDownloadBackendPDF: vi.fn(),
    handleExportToICS: vi.fn(),
  };

  it("renders controls and delegates actions in month/week/day toggles and exports", () => {
    render(<ShiftCalendarFeatureView {...baseProps} />);

    expect(screen.getByText("Calendario de Turnos")).toBeInTheDocument();
    expect(screen.getByText("MONTH-SELECTOR")).toBeInTheDocument();
    expect(screen.getByText("SHIFT-CALENDAR-GRID")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Semana" }));
    expect(baseProps.setViewMode).toHaveBeenCalledWith("week");

    fireEvent.click(screen.getByRole("button", { name: "ICS" }));
    expect(baseProps.handleExportToICS).toHaveBeenCalled();
  });

  it("renders day view content when mode is day and employee is selected", () => {
    const dayProps: React.ComponentProps<typeof ShiftCalendarFeatureView> = {
      ...baseProps,
      viewMode: "day",
      scheduleMap: new Map([
        [
          "2026-03-03",
          {
            type: "employee",
            data: {
              scheduleText: "Turno Día",
              isWorkDay: true,
              patternColor: "#005792",
              startTime: "08:00",
              endTime: "17:00",
              hours: 9,
              shiftPatternName: "Turno Día",
            },
          },
        ],
      ]),
    };

    render(<ShiftCalendarFeatureView {...dayProps} />);

    expect(screen.getByRole("heading", { name: "Turno Día" })).toBeInTheDocument();
    expect(screen.getByText("08:00 - 17:00")).toBeInTheDocument();
    expect(screen.getByText(/\(9\.00 hrs\)/)).toBeInTheDocument();
  });
});
