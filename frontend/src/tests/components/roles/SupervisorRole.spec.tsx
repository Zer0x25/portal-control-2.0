import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ClockingPanel from "../../../features/time-control/components/ClockingPanel";
import TimeRecordRow from "../../../features/time-control/components/TimeRecordRow";
import { useAuth } from "../../../hooks/useAuth";
import { useEmployees } from "../../../hooks/useEmployees";
import { useTimeRecords } from "../../../hooks/useTimeRecords";
import { useLogs } from "../../../hooks/useLogs";
import { useCorrectionRequests } from "../../../hooks/useCorrectionRequests";
import { useTimeRecordMutations } from "../../../hooks/queries/useTimeRecordsQuery";
import { useToasts } from "../../../hooks/useToasts";

// Mock hooks
vi.mock("../../../hooks/useAuth");
vi.mock("../../../hooks/useEmployees");
vi.mock("../../../hooks/useTimeRecords");
vi.mock("../../../hooks/useLogs");
vi.mock("../../../hooks/useCorrectionRequests");
vi.mock("../../../hooks/queries/useTimeRecordsQuery");
vi.mock("../../../hooks/useToasts");
vi.mock("../../../hooks/useMediaQuery", () => ({
  useMediaQuery: () => false,
}));

describe("Supervisor Role Component Permissions", () => {
  const mockSupervisor = { id: "sup-1", username: "supervisor", role: "Supervisor" };
  const mockAdmin = { id: "admin-1", username: "admin", role: "Administrador" };
  const mockAddToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useToasts as any).mockReturnValue({ addToast: mockAddToast });
    (useEmployees as any).mockReturnValue({ activeEmployees: [] });
    (useTimeRecords as any).mockReturnValue({ timeRecordsPage: [], isLoadingRecords: false });
    (useLogs as any).mockReturnValue({ logsPage: { data: [], total: 0 }, isLoadingLogs: false });
    (useCorrectionRequests as any).mockReturnValue({
      requests: [],
      isLoadingRequests: false,
      addCorrectionRequest: vi.fn(),
      updateRequestStatus: vi.fn(),
      getRequestsForEmployee: vi.fn().mockReturnValue([]),
      isUpdatingRequestStatus: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    (useTimeRecordMutations as any).mockReturnValue({
      punchMutation: { mutateAsync: vi.fn(), isPending: false },
    });
  });

  it("should restrict certain actions for Supervisor in ClockingPanel if configured", () => {
    // Escenario: Supervisor intentando realizar acción cuando está deshabilitado por lógica externa
    (useAuth as any).mockReturnValue({ currentUser: mockSupervisor });

    render(
      <ClockingPanel
        isActionDisabled={true}
        roleBasedTooltip="Solo Administradores pueden fichar"
      />,
    );

    const input = screen.getByPlaceholderText(/Búsqueda deshabilitada/i);
    expect(input).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Inicio$/i })).toBeDisabled();
  });

  it("should allow actions for Admin in ClockingPanel in same scenario", () => {
    (useAuth as any).mockReturnValue({ currentUser: mockAdmin });

    render(<ClockingPanel isActionDisabled={false} roleBasedTooltip="" />);

    const input = screen.getByPlaceholderText(/Buscar empleado/i);
    expect(input).not.toBeDisabled();
  });

  it("should disable edit/delete actions for Supervisor in row actions when role is blocked", () => {
    const record = {
      id: "1",
      employeeId: "emp-1",
      employeeName: "JUAN PEREZ",
      employeeArea: "LOGISTICA",
      employeePosition: "OPERADOR",
      employeeWorkdayType: "Full Time",
      date: "2026-02-17",
      status: "Completo",
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
    };

    render(
      <table>
        <tbody>
          <TimeRecordRow
            record={record as any}
            onRowDoubleClick={vi.fn()}
            onAddComment={vi.fn()}
            onDelete={vi.fn()}
            onViewHistory={vi.fn()}
            isActionDisabledForRole={true}
            roleBasedTooltip="Permisos insuficientes"
            accountingLockDate={null}
            isControlInternoEnabled={true}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByTitle(/Agregar novedad/i)).toBeDisabled();
    expect(screen.getByTitle(/Eliminar registro/i)).toBeDisabled();
  });
});
