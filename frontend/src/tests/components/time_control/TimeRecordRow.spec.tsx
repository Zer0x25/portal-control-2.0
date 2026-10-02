import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TimeRecordRow from "../../../features/time-control/components/TimeRecordRow";

// Mock UI components
vi.mock("../../../components/ui/Button", () => ({
  default: ({
    children,
    onClick,
    disabled,
    title,
  }: {
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
    disabled?: boolean;
    title?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  ),
}));

// Mock formatters
vi.mock("../../../utils/formatters", () => ({
  formatDisplayDateTime: (val: string | null | undefined) =>
    val ? val.replace("T", " ").replace("Z", "").split(".")[0] : "--:--",
  formatLogTimestamp: (val: string) => val,
  formatDisplayDate: (val: string) => val,
}));

// Mock icons
vi.mock("../../../components/ui/icons/index", () => ({
  ExclamationTriangleIcon: () => <div data-testid="icon-warning" />,
  ChatBubbleLeftRightIcon: () => <div data-testid="icon-novelty" />,
  DeleteIcon: () => <div data-testid="icon-delete" />,
  ArrowPathIcon: () => <div data-testid="icon-history" />,
}));

describe("TimeRecordRow Component", () => {
  const mockOnRowDoubleClick = vi.fn();
  const mockOnAddComment = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnViewHistory = vi.fn();

  const baseRecord: import("../../../types/derived").AugmentedTimeRecord = {
    id: "1",
    employeeId: "emp-1",
    employeeName: "JUAN PEREZ",
    employeeArea: "LOGÍSTICA",
    employeePosition: "OPERADOR",
    employeeWorkdayType: "Full Time",
    date: "2026-02-17",
    status: "Completado",
    entrada: "2026-02-17T08:00:00Z",
    salida: "2026-02-17T17:00:00Z",
    scheduleInfo: {
      scheduleText: "08:00 - 17:00",
      isWorkDay: true,
      planningStatus: "Programado",
    },
    lastModified: Date.now(),
    syncStatus: "synced",
    isDeleted: false,
    scheduledHours: 8,
    entradaTimestamp: new Date("2026-02-17T08:00:00Z").getTime(),
    salidaTimestamp: new Date("2026-02-17T17:00:00Z").getTime(),
    workedHours: 8,
    overtimeHours: 0,
    isDayOffWorked: false,
  };

  const recordFactory = (
    overrides: Partial<import("../../../types/derived").AugmentedTimeRecord> = {},
  ): import("../../../types/derived").AugmentedTimeRecord => ({
    ...baseRecord,
    ...overrides,
    workedHours: overrides.workedHours ?? 8,
    overtimeHours: overrides.overtimeHours ?? 0,
    scheduledHours: overrides.scheduledHours ?? 8,
    isDayOffWorked: overrides.isDayOffWorked ?? false,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderRow = (
    props: Partial<React.ComponentProps<typeof TimeRecordRow>> = {},
    wrapper: "table" | "div" = "table",
  ) => {
    const row = (
      <TimeRecordRow
        record={baseRecord}
        onRowDoubleClick={mockOnRowDoubleClick}
        onAddComment={mockOnAddComment}
        onDelete={mockOnDelete}
        onViewHistory={mockOnViewHistory}
        isActionDisabledForRole={false}
        roleBasedTooltip=""
        accountingLockDate={null}
        isControlInternoEnabled={true}
        {...props}
      />
    );

    if (wrapper === "div") return render(<div>{row}</div>);

    return render(
      <table>
        <tbody>{row}</tbody>
      </table>,
    );
  };

  it("should render record data correctly", () => {
    renderRow();
    expect(screen.getByText(/JUAN PEREZ/i)).toBeInTheDocument();
    expect(screen.getByText(/LOGÍSTICA/i)).toBeInTheDocument();
    expect(screen.getByText(/08:00/i)).toBeInTheDocument();
    expect(screen.getByText(/17:00/i)).toBeInTheDocument();
  });

  it("should show edit indicator from externalEdits", () => {
    renderRow({
      externalEdits: [
        {
          id: "log-1",
          action: "Time Record Edited",
          timestamp: new Date().toISOString(),
          actorUsername: "admin",
          details: { recordId: "1", fieldEdited: "entrada", oldValue: "08:05" },
        } as any,
      ],
    });
    expect(screen.getByTestId("icon-warning")).toBeInTheDocument();
  });

  it("should show pending request indicator from externalPendingRequest", () => {
    renderRow({
      externalPendingRequest: { id: "req-1", timeRecordId: "1", status: "pending" } as any,
    });
    expect(screen.getAllByTestId("icon-warning").length).toBeGreaterThan(0);
  });

  it("should call onAddComment when clicking novelty button", () => {
    renderRow();
    const btn = screen.getByTitle(/Agregar novedad/i);
    fireEvent.click(btn);
    expect(mockOnAddComment).toHaveBeenCalledWith(baseRecord);
  });

  it("should call onDelete when clicking delete button", () => {
    renderRow();
    const btn = screen.getByTitle(/Eliminar registro/i);
    fireEvent.click(btn);
    expect(mockOnDelete).toHaveBeenCalledWith(baseRecord);
  });

  it("should disable actions when record date equals accounting lock date", () => {
    renderRow({ accountingLockDate: "2026-02-17" });
    const noveltyBtn = screen.getByTitle(/Agregar novedad/i);
    const deleteBtn = screen.getByTitle(/Eliminar registro/i);
    expect(noveltyBtn).toBeDisabled();
    expect(deleteBtn).toBeDisabled();
  });

  it("should disable actions when record date is before accounting lock date", () => {
    renderRow({ accountingLockDate: "2026-02-18" });
    expect(screen.getByTitle(/Agregar novedad/i)).toBeDisabled();
    expect(screen.getByTitle(/Eliminar registro/i)).toBeDisabled();
  });

  it("should keep actions enabled when record date is after accounting lock date", () => {
    renderRow({ accountingLockDate: "2026-02-16" });
    expect(screen.getByTitle(/Agregar novedad/i)).not.toBeDisabled();
    expect(screen.getByTitle(/Eliminar registro/i)).not.toBeDisabled();
  });

  it("should call onRowDoubleClick when double clicking row", () => {
    renderRow();
    const row = screen.getByRole("row");
    fireEvent.doubleClick(row);
    expect(mockOnRowDoubleClick).toHaveBeenCalledWith(baseRecord);
  });

  it("should not call onRowDoubleClick when record is locked", () => {
    renderRow({ accountingLockDate: "2026-02-17" });
    fireEvent.doubleClick(screen.getByRole("row"));
    expect(mockOnRowDoubleClick).not.toHaveBeenCalled();
  });

  it("should disable actions when record is justified", () => {
    renderRow({
      record: recordFactory({
        justification: { type: "Licencia", reason: "Médica" } as any,
      }),
    });
    expect(screen.getByTitle(/Agregar novedad/i)).toBeDisabled();
    expect(screen.getByTitle(/Eliminar registro/i)).toBeDisabled();
  });

  it("should disable actions when role permissions block actions", () => {
    renderRow({ isActionDisabledForRole: true });
    expect(screen.getByTitle(/Agregar novedad/i)).toBeDisabled();
    expect(screen.getByTitle(/Eliminar registro/i)).toBeDisabled();
  });

  it("should hide novelty button when control interno is disabled", () => {
    renderRow({ isControlInternoEnabled: false });
    expect(screen.queryByTitle(/Agregar novedad/i)).not.toBeInTheDocument();
    expect(screen.getByTitle(/Eliminar registro/i)).toBeInTheDocument();
  });

  it("should show progress indicator for open record and cap at 100 percent", () => {
    renderRow({
      record: recordFactory({
        status: "Laborando",
        scheduledHours: 2,
        entradaTimestamp: new Date("2026-02-17T08:00:00Z").getTime(),
        salidaTimestamp: new Date("2026-02-17T13:00:00Z").getTime(),
      }),
    });
    expect(screen.getByTitle("100% de jornada completada")).toBeInTheDocument();
  });

  it("should render placeholder for SIN REGISTRO timestamps", () => {
    renderRow({
      record: recordFactory({
        entrada: "SIN REGISTRO" as any,
      }),
    });
    expect(screen.getAllByText("--:--").length).toBeGreaterThan(0);
  });

  it("should render and execute actions in table-row-div layout", () => {
    renderRow(
      {
        layoutMode: "table-row-div",
      },
      "div",
    );

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]);
    fireEvent.click(buttons[2]);

    expect(mockOnViewHistory).toHaveBeenCalledTimes(1);
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  it("should keep lock behavior deterministic with UTC timestamps near date boundary", () => {
    renderRow({
      record: recordFactory({
        date: "2026-02-17",
        entrada: "2026-02-17T23:59:59Z",
      }),
      accountingLockDate: "2026-02-17",
    });
    expect(screen.getByTitle(/Agregar novedad/i)).toBeDisabled();
  });
});
