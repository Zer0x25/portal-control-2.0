import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import WorkerPortalView from "../../../features/worker-portal/views/WorkerPortal.view";

vi.mock("../../../features/worker-portal", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../features/worker-portal")>();
  return {
    ...actual,
    CorrectionRequestModal: () => <div>CORRECTION-MODAL</div>,
  };
});

describe("WorkerPortalView", () => {
  const baseProps: React.ComponentProps<typeof WorkerPortalView> = {
    currentUser: {
      id: "u1",
      username: "ana",
      role: "Usuario",
      employeeId: "e1",
      lastModified: 0,
      syncStatus: "synced",
      isDeleted: false,
    },
    employee: {
      id: "e1",
      name: "Ana",
      area: "Ops",
      position: "Operador",
      workdayType: "Full",
      status: "Activo",
      lastModified: 0,
      syncStatus: "synced",
      isDeleted: false,
    },
    isLoadingEmployees: false,
    isLoadingSchedulingData: false,
    modalState: { isOpen: false, record: null, field: null },
    setModalState: vi.fn(),
    selectedMonth: "2026-03",
    setSelectedMonth: vi.fn(),
    isMobile: false,
    monthOptions: [{ value: "2026-03", label: "Marzo 2026" }],
    enrichedRecords: [],
    status: "fuera",
    requestsMap: new Map(),
    handleExportPDF: vi.fn(),
    handleClockingAction: vi.fn(),
    openCorrectionModal: vi.fn(),
    formatDisplayDateTime: vi.fn(() => "2026-03-03 08:00"),
    formatDecimalHoursToHHMM: vi.fn(() => "08:00"),
  };

  it("renders loading and error fallback states", () => {
    const { rerender } = render(
      <WorkerPortalView {...baseProps} currentUser={null} isLoadingEmployees={true} />,
    );
    expect(screen.getByText("Cargando portal del trabajador...")).toBeInTheDocument();

    rerender(<WorkerPortalView {...baseProps} employee={null} />);
    expect(screen.getByText("Error de Configuración de Cuenta")).toBeInTheDocument();
  });

  it("renders main portal and clocking actions", () => {
    render(<WorkerPortalView {...baseProps} />);

    expect(screen.getByText("Portal del Trabajador")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Inicio Jornada" }));
    expect(baseProps.handleClockingAction).toHaveBeenCalledWith("jornada_inicio");
  });
});
