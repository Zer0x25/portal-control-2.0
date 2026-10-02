import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import OverviewTab from "../../../features/supervisor-dashboard/components/OverviewTab";
import { useDashboardOverviewQuery } from "../../../hooks/queries/useDashboardQueries";

vi.mock("../../../hooks/queries/useDashboardQueries");

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("../../../features/supervisor-dashboard/components/LiveStatusPanel", () => ({
  default: ({ employeesWithStatus, selectedStatuses, onStatusesChange, onEmployeeClick }: any) => (
    <div data-testid="live-status-panel">
      <span>Employees count: {employeesWithStatus?.length || 0}</span>
      <span>Selected: {selectedStatuses?.join(",") || ""}</span>
      <button onClick={() => onStatusesChange(["en_jornada"])}>Change Status</button>
      <button onClick={() => onEmployeeClick?.({ id: "1", name: "Juan" })}>Open Calendar</button>
    </div>
  ),
}));

vi.mock("../../../features/supervisor-dashboard/components/EmployeeCalendarModal", () => ({
  default: ({ employee, onClose }: any) => (
    <div data-testid="employee-calendar-modal">
      <span>Calendar for: {employee?.name || ""}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe("OverviewTab Component", () => {
  const buildOverviewMock = (overrides: Partial<any> = {}) => ({
    employeeStatuses: [
      { employee: { id: "1", name: "Juan" }, status: "en_jornada" },
      { employee: { id: "4", name: "Sofia" }, status: "en_jornada_post_colacion" },
      { employee: { id: "5", name: "Ana" }, status: "jornada_terminada_anomalia" },
      { employee: { id: "2", name: "Maria" }, status: "ausente" },
      { employee: { id: "3", name: "Pedro" }, status: "no_programado" },
    ],
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (useDashboardOverviewQuery as any).mockReturnValue({
      data: buildOverviewMock(),
      isLoading: false,
    });
  });

  it("should render KPI cards with calculated stats", () => {
    render(<OverviewTab />);

    expect(screen.getByText("Total Programados Hoy")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();

    expect(screen.getByText("Personal en Jornada")).toBeInTheDocument();
    expect(screen.getByText("Ausencias / Licencias")).toBeInTheDocument();
    expect(screen.getByText("Jornadas Finalizadas")).toBeInTheDocument();
    expect(screen.getByText("Día Descanso (No Prog.)")).toBeInTheDocument();
    expect(screen.getAllByText("1").length).toBeGreaterThan(1);
  });

  it("should update selectedStatuses when a KPI card is clicked", () => {
    render(<OverviewTab />);

    // Por defecto es "all"
    expect(screen.getByText("Selected: all")).toBeInTheDocument();

    // Click en "Personal en Jornada"
    const workingStat = screen.getByText("Personal en Jornada");
    fireEvent.click(workingStat);

    expect(screen.getByText("Selected: en_jornada,en_jornada_post_colacion")).toBeInTheDocument();
  });

  it("should update selectedStatuses for day-off and finished KPI cards", () => {
    render(<OverviewTab />);

    fireEvent.click(screen.getByText("Día Descanso (No Prog.)"));
    expect(screen.getByText("Selected: no_programado")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Jornadas Finalizadas"));
    expect(screen.getByText("Selected: terminada,jornada_terminada_anomalia")).toBeInTheDocument();
  });

  it("should pass correct employees to LiveStatusPanel", () => {
    render(<OverviewTab />);
    expect(screen.getByText("Employees count: 5")).toBeInTheDocument();
  });

  it("should open and close employee calendar modal", () => {
    render(<OverviewTab />);

    fireEvent.click(screen.getByText("Open Calendar"));
    expect(screen.getByTestId("employee-calendar-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Close"));
    expect(screen.queryByTestId("employee-calendar-modal")).not.toBeInTheDocument();
  });

  it("should render zeroed state when query returns undefined data", () => {
    (useDashboardOverviewQuery as any).mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    render(<OverviewTab />);

    expect(screen.getByText("Employees count: 0")).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
  });

  it("should degrade silently under API error-like empty payload", () => {
    (useDashboardOverviewQuery as any).mockReturnValue({
      data: { employeeStatuses: [] },
      isLoading: false,
      isError: true,
      error: new Error("API error"),
    });

    render(<OverviewTab />);

    expect(screen.getByText("Employees count: 0")).toBeInTheDocument();
    expect(screen.getByText("Total Programados Hoy")).toBeInTheDocument();
  });
});
