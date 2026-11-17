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
  it("mantiene las tarjetas principales con el radio canónico del sistema", () => {
    const { container } = render(<WorkerPortalView {...makeProps()} />);

    expect(screen.getByTestId("worker-identity").closest(".rounded-md")).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/rounded-(?:2xl|3xl|4xl|\[)/);
  });

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

  it("AC7: deshabilita todas las acciones y permite reintentar si falla el último marcaje", () => {
    const retryClockingStatus = vi.fn();
    render(
      <WorkerPortalView
        {...makeProps({
          isClockingStatusUncertain: true,
          isClockingStatusError: true,
          retryClockingStatus,
        })}
      />,
    );

    expect(screen.getByText("No se pudo consultar tu último marcaje.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Inicio Jornada" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Inicio Colación" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Fin Colación" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Fin Jornada" })).toBeDisabled();
    screen.getByRole("button", { name: "Reintentar marcaje" }).click();
    expect(retryClockingStatus).toHaveBeenCalledTimes(1);
  });

  it("AC1: deshabilita correcciones mientras no se verifican todas las pendientes", () => {
    const retryPendingCorrectionRequests = vi.fn();
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
          isPendingCorrectionsUncertain: true,
          isPendingCorrectionsError: true,
          retryPendingCorrectionRequests,
          enrichedRecords: [record] as unknown as React.ComponentProps<
            typeof WorkerPortalView
          >["enrichedRecords"],
        })}
      />,
    );

    expect(
      screen.getByText(/No se pudieron consultar todas tus solicitudes pendientes/),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Corregir" })).toHaveLength(4);
    expect(
      screen
        .getAllByRole("button", { name: "Corregir" })
        .every((button) => button.hasAttribute("disabled")),
    ).toBe(true);
    screen.getByRole("button", { name: "Reintentar solicitudes" }).click();
    expect(retryPendingCorrectionRequests).toHaveBeenCalledTimes(1);
  });

  it("AC8: representa carga y error del historial sin mostrar un vacío falso", () => {
    const retryCorrectionRequests = vi.fn();
    const { rerender } = render(
      <WorkerPortalView {...makeProps({ isLoadingCorrectionRequests: true })} />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Cargando historial de solicitudes");
    expect(
      screen.queryByText("Todavía no tienes solicitudes de corrección."),
    ).not.toBeInTheDocument();

    rerender(
      <WorkerPortalView
        {...makeProps({
          isErrorCorrectionRequests: true,
          retryCorrectionRequests,
        })}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar tu historial");
    expect(
      screen.queryByText("Todavía no tienes solicitudes de corrección."),
    ).not.toBeInTheDocument();
    screen.getByRole("button", { name: "Reintentar historial" }).click();
    expect(retryCorrectionRequests).toHaveBeenCalledTimes(1);
  });

  it("AC8: comunica fallo al cargar una página adicional y permite reintentarla", () => {
    const retryCorrectionRequests = vi.fn();
    const request = {
      id: "req-1",
      employeeId: "e1-12345678",
      timeRecordId: "r1",
      recordField: "entrada",
      originalValue: "2026-03-05T12:00:00.000Z",
      requestedValue: "2026-03-05T13:00:00.000Z",
      reason: "Olvidé marcar",
      status: "rejected",
      createdAt: Date.parse("2026-03-05T14:00:00.000Z"),
      lastModified: Date.parse("2026-03-06T15:00:00.000Z"),
      syncStatus: "synced",
      isDeleted: false,
    };
    render(
      <WorkerPortalView
        {...makeProps({
          correctionRequests: [request] as unknown as React.ComponentProps<
            typeof WorkerPortalView
          >["correctionRequests"],
          hasMoreCorrectionRequests: true,
          isErrorCorrectionRequests: true,
          isCorrectionRequestsNextPageError: true,
          retryCorrectionRequests,
        })}
      />,
    );

    expect(screen.getByTestId("correction-history-entry")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar más solicitudes");
    expect(screen.getByRole("button", { name: "Cargar más solicitudes" })).toBeDisabled();
    screen.getByRole("button", { name: "Reintentar historial" }).click();
    expect(retryCorrectionRequests).toHaveBeenCalledTimes(1);
  });

  it("AC8: muestra estado, fechas, rechazo y responsable en el historial propio", () => {
    const loadMoreCorrectionRequests = vi.fn();
    render(
      <WorkerPortalView
        {...makeProps({
          hasMoreCorrectionRequests: true,
          loadMoreCorrectionRequests,
          correctionRequests: [
            {
              id: "req-1",
              employeeId: "e1-12345678",
              timeRecordId: "r1",
              recordField: "entrada",
              originalValue: "2026-03-05T12:00:00.000Z",
              requestedValue: "2026-03-05T13:00:00.000Z",
              reason: "Olvidé marcar",
              status: "rejected",
              resolvedBy: "supervisor.qa",
              resolvedAt: Date.parse("2026-03-06T15:00:00.000Z"),
              rejectionReason: "La solicitud no corresponde",
              createdAt: Date.parse("2026-03-05T14:00:00.000Z"),
              lastModified: Date.parse("2026-03-06T15:00:00.000Z"),
              syncStatus: "synced",
              isDeleted: false,
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("Historial de solicitudes de corrección")).toBeInTheDocument();
    expect(screen.getByText("Rechazada")).toBeInTheDocument();
    expect(screen.getByText("Motivo de rechazo: La solicitud no corresponde")).toBeInTheDocument();
    expect(screen.getByText("Responsable: supervisor.qa")).toBeInTheDocument();
    expect(screen.getByTestId("correction-history-entry")).toHaveTextContent(
      "solicitud del 2026-03-05 08:00",
    );
    expect(screen.getByText(/Fecha de resolución:/)).toBeInTheDocument();
    const loadMore = screen.getByRole("button", { name: "Cargar más solicitudes" });
    expect(loadMore).toBeInTheDocument();
    loadMore.click();
    expect(loadMoreCorrectionRequests).toHaveBeenCalledTimes(1);
  });
});
