import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import KpisTab from "../../../features/supervisor-dashboard/components/KpisTab";
import { useKpiCalculations } from "../../../hooks/useKpiCalculations";
import { isDateRangeValid } from "../../../utils/validation";

vi.mock("../../../hooks/useKpiCalculations");
vi.mock("../../../utils/validation");

vi.mock("../../../features/supervisor-dashboard/components/KpiFilterPanel", () => ({
  default: ({ onFiltersChange }: any) => (
    <div>
      <button
        onClick={() =>
          onFiltersChange({
            employees: [{ id: "e1", name: "JUAN" }],
            startDate: new Date("2026-02-01T00:00:00Z"),
            endDate: new Date("2026-02-10T00:00:00Z"),
          })
        }
      >
        Emit Valid Filters
      </button>
      <button
        onClick={() =>
          onFiltersChange({
            employees: [{ id: "e1", name: "JUAN" }],
            startDate: new Date("2026-02-10T00:00:00Z"),
            endDate: new Date("2026-02-01T00:00:00Z"),
          })
        }
      >
        Emit Invalid Filters
      </button>
    </div>
  ),
}));

vi.mock("../../../features/supervisor-dashboard/components/KpiDetailsModal", () => ({
  default: ({ isOpen, title }: any) =>
    isOpen ? <div data-testid="kpi-details-modal">{title}</div> : null,
}));

vi.mock("framer-motion", () => {
  const actual = vi.importActual("framer-motion");
  return {
    ...actual,
    motion: new Proxy(
      {},
      {
        get: (_target, key) => {
          return ({ children, ...props }: any) => {
            const Tag = key as any;
            return <Tag {...props}>{children}</Tag>;
          };
        },
      },
    ),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

describe("KpisTab Component", () => {
  const buildKpiMock = (overrides: Partial<any> = {}) => ({
    totalAbsenteeismRate: 5.5,
    unjustifiedAbsenceRate: 2.1,
    justifiedAbsenceRate: 3.4,
    vacationRate: 1.5,
    medicalLeaveRate: 1.0,
    specialPermitRate: 0.9,
    tardinessRate: 12.0,
    overtimePercentage: 8.5,
    avgWeeklyHours: 42.5,
    tardinessCount: 15,
    absenceCount: 5,
    vacationCount: 10,
    medicalLeaveCount: 3,
    specialPermitCount: 2,
    ...overrides,
  });

  const buildKpiDetailsMock = (overrides: Partial<any> = {}) => ({
    tardyRecords: [{ id: "1", employeeName: "Juan", date: "2024-01-01" }],
    absentEmployees: [],
    vacationRecords: [],
    medicalLeaveRecords: [],
    specialPermitRecords: [],
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isDateRangeValid).mockReturnValue(true);
    (useKpiCalculations as any).mockReturnValue({
      kpis: buildKpiMock(),
      kpiDetails: buildKpiDetailsMock(),
      isLoadingKpis: false,
      calculateKpis: vi.fn(),
    });
  });

  it("should render KPI cards with correct data", () => {
    render(<KpisTab />);

    expect(screen.getByText(/Asistencia y Puntualidad/i)).toBeInTheDocument();
    expect(screen.getByText(/Eficiencia Horaria/i)).toBeInTheDocument();

    // Verificar valores específicos
    expect(screen.getByText("15")).toBeInTheDocument(); // tardinessCount
    expect(screen.getByText("5")).toBeInTheDocument(); // absenceCount

    // Verificar porcentajes en Eficiencia Horaria
    expect(screen.getByText("5.50%")).toBeInTheDocument();
    expect(screen.getByText("12.00%")).toBeInTheDocument();
    expect(screen.getByText("42.50")).toBeInTheDocument();
  });

  it("should show loading overlay when isLoadingKpis is true", () => {
    (useKpiCalculations as any).mockReturnValue({
      kpis: buildKpiMock(),
      kpiDetails: buildKpiDetailsMock(),
      isLoadingKpis: true,
      calculateKpis: vi.fn(),
    });

    render(<KpisTab />);
    expect(screen.getByText(/CALIBRANDO MÉTRICAS TÉCNICAS/i)).toBeInTheDocument();
  });

  it("should open details modal when clicking on a KPI stat", () => {
    render(<KpisTab />);

    const tardyStat = screen.getByText(/Registros con Atraso/i);
    fireEvent.click(tardyStat);

    // El modal debería mostrarse (verificamos el título del modal)
    expect(screen.getByText(/Detalle de Atrasos/i)).toBeInTheDocument();
  });

  it("should show invalid date range state when filter emits invalid dates", () => {
    vi.mocked(isDateRangeValid).mockReturnValue(false);
    render(<KpisTab />);

    fireEvent.click(screen.getByText("Emit Invalid Filters"));
    expect(screen.getByText(/Parámetros de Tiempo Inválidos/i)).toBeInTheDocument();
  });

  it("should show no-data-period banner when filters are set and KPI data is empty", () => {
    (useKpiCalculations as any).mockReturnValue({
      kpis: buildKpiMock({
        tardinessCount: 0,
        absenceCount: 0,
        vacationCount: 0,
        medicalLeaveCount: 0,
        specialPermitCount: 0,
      }),
      kpiDetails: buildKpiDetailsMock({
        tardyRecords: [],
        absentEmployees: [],
        vacationRecords: [],
        medicalLeaveRecords: [],
        specialPermitRecords: [],
      }),
      isLoadingKpis: false,
      calculateKpis: vi.fn(),
    });

    render(<KpisTab />);
    fireEvent.click(screen.getByText("Emit Valid Filters"));

    expect(screen.getByText(/Periodo sin registros/i)).toBeInTheDocument();
  });

  it("should not open details modal when clicked KPI has empty details", () => {
    (useKpiCalculations as any).mockReturnValue({
      kpis: buildKpiMock(),
      kpiDetails: buildKpiDetailsMock({ tardyRecords: [] }),
      isLoadingKpis: false,
      calculateKpis: vi.fn(),
    });

    render(<KpisTab />);
    fireEvent.click(screen.getByText(/Registros con Atraso/i));

    expect(screen.queryByTestId("kpi-details-modal")).not.toBeInTheDocument();
  });

  it("should render stable fallback values under degraded API-like data", () => {
    (useKpiCalculations as any).mockReturnValue({
      kpis: buildKpiMock({
        totalAbsenteeismRate: 0,
        unjustifiedAbsenceRate: 0,
        justifiedAbsenceRate: 0,
        vacationRate: 0,
        medicalLeaveRate: 0,
        specialPermitRate: 0,
        tardinessRate: 0,
        overtimePercentage: 0,
        avgWeeklyHours: 0,
        tardinessCount: 0,
        absenceCount: 0,
        vacationCount: 0,
        medicalLeaveCount: 0,
        specialPermitCount: 0,
      }),
      kpiDetails: buildKpiDetailsMock({
        tardyRecords: [],
        absentEmployees: [],
        vacationRecords: [],
        medicalLeaveRecords: [],
        specialPermitRecords: [],
      }),
      isLoadingKpis: false,
      calculateKpis: vi.fn(),
    });

    render(<KpisTab />);

    expect(screen.getAllByText("0.00%").length).toBeGreaterThan(0);
    expect(screen.getByText("0.00")).toBeInTheDocument();
  });
});
