import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import WorkerPortalView from "../../../features/worker-portal/views/WorkerPortal.view";

vi.mock("../../../features/worker-portal", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../features/worker-portal")>();
  return {
    ...actual,
    CorrectionRequestModal: () => <div>CORRECTION-MODAL</div>,
  };
});

const baseEmployee = {
  id: "e1-12345678",
  name: "Ana",
  area: "Ops",
  position: "Operador",
  workdayType: "Full",
  status: "Activo",
  lastModified: 0,
  syncStatus: "synced",
  isDeleted: false,
} as const;

const baseUser = {
  id: "u1",
  username: "ana",
  role: "Usuario",
  employeeId: "e1-12345678",
  lastModified: 0,
  syncStatus: "synced",
  isDeleted: false,
} as const;

function makeProps(overrides: Partial<React.ComponentProps<typeof WorkerPortalView>> = {}) {
  return {
    currentUser: { ...baseUser },
    employee: { ...baseEmployee },
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
    formatDisplayDateTime: () => "2026-03-05 08:00",
    formatDecimalHoursToHHMM: () => "08:00",
    ...overrides,
  } as unknown as React.ComponentProps<typeof WorkerPortalView>;
}

describe("WorkerPortalView antiregresión (spec 028)", () => {
  it("AC1: muestra Cargando y no error cuando está resolviendo sin empleado", () => {
    render(<WorkerPortalView {...makeProps({ employee: null, isLoadingEmployees: true })} />);
    expect(screen.getByText("Cargando portal del trabajador...")).toBeInTheDocument();
    expect(screen.queryByText("Error de Configuración de Cuenta")).not.toBeInTheDocument();
  });

  it("AC1b: con empleado ya resuelto no bloquea en Cargando aunque siga isLoading", () => {
    render(<WorkerPortalView {...makeProps({ isLoadingEmployees: true })} />);
    expect(screen.getByText("Portal del Trabajador")).toBeInTheDocument();
    expect(screen.queryByText("Cargando portal del trabajador...")).not.toBeInTheDocument();
  });

  it("AC5: botón [Corregir] visible en foco/táctil (sin opacity-0 exclusivo)", () => {
    const record = {
      id: "r1",
      employeeId: "e1-12345678",
      date: "2026-03-05",
      entrada: "2026-03-05T12:00:00.000Z",
      inicioColacion: null,
      finColacion: null,
      salida: null,
      scheduledHours: 8,
      workedHours: 4,
      overtimeHours: 0,
    };
    render(
      <WorkerPortalView
        {...makeProps({
          enrichedRecords: [record] as unknown as React.ComponentProps<
            typeof WorkerPortalView
          >["enrichedRecords"],
        })}
      />,
    );
    const btns = screen.getAllByRole("button", { name: /corregir/i });
    expect(btns.length).toBeGreaterThan(0);
    for (const b of btns) {
      const cls = b.className;
      // No debe ser solo hover: debe incluir foco y ser visible en mobile
      expect(cls).toContain("focus-visible:opacity-100");
      expect(cls).toContain("md:group-focus-within/cell:opacity-100");
      expect(cls).not.toMatch(/(^|\s)opacity-0(\s|$)/);
    }
  });

  it("deshabilita acciones según estado (fuera → solo Inicio Jornada habilitado)", () => {
    const handleClockingAction = vi.fn();
    render(<WorkerPortalView {...makeProps({ status: "fuera", handleClockingAction })} />);
    expect(screen.getByRole("button", { name: "Inicio Jornada" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Inicio Colación" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Fin Colación" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Fin Jornada" })).toBeDisabled();
  });
});
