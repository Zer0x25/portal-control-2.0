import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LogbookView } from "../../../features/logbook/views/Logbook.view";

vi.mock("../../../components/ui/ShiftReportModal", () => ({
  default: () => <div>SHIFT-REPORT-MODAL</div>,
}));

vi.mock("../../../components/ui/ClosedReportsModal", () => ({
  default: () => <div>CLOSED-REPORTS-MODAL</div>,
}));

vi.mock("../../../features/logbook/components/LogEntriesCard", () => ({
  default: () => <div>LOG-ENTRIES-CARD</div>,
}));

vi.mock("../../../features/logbook/components/SupplierEntriesCard", () => ({
  default: () => <div>SUPPLIER-ENTRIES-CARD</div>,
}));

describe("LogbookView", () => {
  const baseProps: React.ComponentProps<typeof LogbookView> = {
    isLoadingReports: false,
    activeShift: {
      id: "s1",
      folio: "120",
      date: "2026-03-03",
      shiftName: "Turno Mañana",
      startTime: "2026-03-03T08:00:00.000Z",
      responsibleUser: "admin",
      status: "open",
      logEntries: [],
      supplierEntries: [],
      reportCreatedAt: "2026-03-03T08:00:00.000Z",
      updatedAt: "2026-03-03T08:00:00.000Z",
      lastModified: 0,
      syncStatus: "synced",
      isDeleted: false,
    },
    isMobile: false,
    isStartingShift: false,
    showShiftHistoryModal: false,
    showLogEntryModal: false,
    showSupplierEntryModal: false,
    showFabMenu: false,
    selectedReport: null,
    showLogoutCountdownModal: false,
    countdown: 10,
    showCloseShiftConfirmation: false,
    canCurrentUserCloseActiveShift: true,
    setShowShiftHistoryModal: vi.fn(),
    setShowLogEntryModal: vi.fn(),
    setShowSupplierEntryModal: vi.fn(),
    setShowFabMenu: vi.fn(),
    setShowCloseShiftConfirmation: vi.fn(),
    getResponsibleDisplayName: vi.fn(() => "Administrador"),
    executeCloseShift: vi.fn(),
    handleStartShift: vi.fn(),
    handleUpdateShift: vi.fn(),
    handleOpenReportDetails: vi.fn(),
    handleCloseReportDetails: vi.fn(),
    handleNavigateDashboard: vi.fn(),
    onDownloadPDF: vi.fn(),
    onExportExcel: vi.fn(),
  };

  it("renders active shift summary and cards", () => {
    render(<LogbookView {...baseProps} />);

    expect(screen.getByText("Libro de Novedades")).toBeInTheDocument();
    expect(screen.getByText("Turno Mañana")).toBeInTheDocument();
    expect(screen.getByText("LOG-ENTRIES-CARD")).toBeInTheDocument();
    expect(screen.getByText("SUPPLIER-ENTRIES-CARD")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Historial de Turnos" }));
    expect(baseProps.setShowShiftHistoryModal).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole("button", { name: "Cerrar Guardía" }));
    expect(baseProps.setShowCloseShiftConfirmation).toHaveBeenCalledWith(true);
  });

  it("renders empty state and start action when there is no active shift", () => {
    const propsWithoutShift: React.ComponentProps<typeof LogbookView> = {
      ...baseProps,
      activeShift: null,
    };

    render(<LogbookView {...propsWithoutShift} />);

    expect(screen.getByText("Sin Operación Activa")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Iniciar Registro de Guardia" }));
    expect(baseProps.handleStartShift).toHaveBeenCalled();
  });
});
