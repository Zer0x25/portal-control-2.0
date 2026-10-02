import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TimeRecordFilters from "../../../features/time-control/components/TimeRecordFilters";
import { useEmployees } from "../../../hooks/useEmployees";
import { useTimeRecords } from "../../../hooks/useTimeRecords";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { QuickFilterMode } from "../../../features/time-control/hooks/useTimeRecordFilters";
import { Employee, DailyTimeRecord } from "../../../types";

// Mock hooks
vi.mock("../../../hooks/useEmployees");
vi.mock("../../../hooks/useTimeRecords");
vi.mock("../../../hooks/useMediaQuery");

// Mock UI components
vi.mock("../../../components/ui/Button", () => ({
  default: ({
    children,
    onClick,
    disabled,
    title,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    title?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  ),
}));

vi.mock("../../../components/ui/Input", () => ({
  default: ({
    label,
    value,
    onChange,
    type,
  }: {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type: string;
  }) => (
    <div>
      <label htmlFor={label}>{label}</label>
      <input id={label} type={type} value={value} onChange={onChange} />
    </div>
  ),
}));

// Mock framer-motion to avoid issues with animations in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("TimeRecordFilters Component", () => {
  const mockOnClientFilterChange = vi.fn();
  const mockOnDateFilterChange = vi.fn();
  const mockOnQuickFilterClick = vi.fn();
  const mockOnApplyCustomFilters = vi.fn();
  const mockOnClearFilters = vi.fn();

  const mockEmployees: Partial<Employee>[] = [
    { id: "1", name: "Juan", area: "Area 1", workdayType: "Full Time" },
    { id: "2", name: "Maria", area: "Area 2", workdayType: "Part Time" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEmployees).mockReturnValue({
      activeEmployees: mockEmployees as Employee[],
    } as ReturnType<typeof useEmployees>);
    vi.mocked(useTimeRecords).mockReturnValue({
      allRecordsInDateRange: [{ employeeId: "1", status: "Completado" } as DailyTimeRecord],
      isLoadingRecords: false,
    } as ReturnType<typeof useTimeRecords>);
    vi.mocked(useMediaQuery).mockReturnValue(false); // Desktop by default
  });

  const defaultProps = {
    clientFilters: { name: "", area: "", workdayType: "", status: "" },
    dateFilters: { desde: "2026-02-01", hasta: "2026-02-17", is24h: false },
    onClientFilterChange: mockOnClientFilterChange,
    onDateFilterChange: mockOnDateFilterChange,
    onQuickFilterClick: mockOnQuickFilterClick,
    onApplyCustomFilters: mockOnApplyCustomFilters,
    onClearFilters: mockOnClearFilters,
    isApplyButtonEnabled: true,
    periodDisplayText: "Febrero 2026",
    activeQuickFilter: null as QuickFilterMode,
  };

  it("should render filter controls correctly", () => {
    render(<TimeRecordFilters {...defaultProps} />);

    expect(screen.getByRole("combobox", { name: /Tipo Jornada/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Área Operativa/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Estado/i })).toBeInTheDocument();
    expect(screen.getByText(/Rango Rápido/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Desde/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hasta/i)).toBeInTheDocument();
  });

  it("should call onClientFilterChange when changing workday type", () => {
    render(<TimeRecordFilters {...defaultProps} />);
    const select = screen.getByRole("combobox", { name: /Tipo Jornada/i });

    fireEvent.change(select, { target: { value: "Full Time" } });
    expect(mockOnClientFilterChange).toHaveBeenCalledWith({ workdayType: "Full Time" });
  });

  it("should call onQuickFilterClick when clicking a quick filter", () => {
    render(<TimeRecordFilters {...defaultProps} />);
    const weekBtn = screen.getByText("7d");

    fireEvent.click(weekBtn);
    expect(mockOnQuickFilterClick).toHaveBeenCalledWith("week");
  });

  it("should call onApplyCustomFilters when clicking Aplicar", () => {
    render(<TimeRecordFilters {...defaultProps} />);
    const applyBtn = screen.getByText(/Aplicar/i);

    fireEvent.click(applyBtn);
    expect(mockOnApplyCustomFilters).toHaveBeenCalled();
  });

  it("should call onClearFilters when clicking Limpiar", () => {
    render(<TimeRecordFilters {...defaultProps} />);
    const clearBtn = screen.getByTitle(/Limpiar Filtros/i);

    fireEvent.click(clearBtn);
    expect(mockOnClearFilters).toHaveBeenCalled();
  });

  it("should show/hide filters in mobile view", () => {
    vi.mocked(useMediaQuery).mockReturnValue(true); // Mobile
    render(<TimeRecordFilters {...defaultProps} />);

    const toggleBtn = screen.getByText(/Mostrar Filtros/i);
    fireEvent.click(toggleBtn);

    expect(screen.getByText(/Ocultar Filtros/i)).toBeInTheDocument();
  });
});
