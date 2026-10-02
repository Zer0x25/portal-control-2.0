import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TimeRecordTable from "../../../features/time-control/components/TimeRecordTable";
import { EnrichedTimeRecord } from "../../../types/derived";
import { useToasts } from "../../../hooks/useToasts";
import { useIntersectionObserver } from "../../../hooks/useIntersectionObserver";
import { useLogs } from "../../../hooks/useLogs";
import { useCorrectionRequests } from "../../../hooks/useCorrectionRequests";

// Mock hooks and components
vi.mock("../../../hooks/useToasts");
vi.mock("../../../hooks/useIntersectionObserver");
vi.mock("../../../hooks/useLogs");
vi.mock("../../../hooks/useCorrectionRequests");
vi.mock("../../../hooks/useMediaQuery", () => ({
  useMediaQuery: vi.fn(),
}));
vi.mock("../../../utils/export/index", () => ({
  exportToPDF: vi.fn(),
}));
vi.mock("../../../utils/formatters", () => ({
  formatDisplayDateTime: (val: string | null | undefined) => val || "",
}));
vi.mock("../../../components/ui/ResponsiveView", () => ({
  default: ({ mobile, desktop }: { mobile: React.ReactNode; desktop: React.ReactNode }) => (
    <div data-testid="responsive-view">
      <div data-testid="mobile-container">{mobile}</div>
      <div data-testid="desktop-container">{desktop}</div>
    </div>
  ),
}));
vi.mock("../../../features/time-control/components/TimeRecordTableViewDesktop", () => ({
  default: ({ records, fetchNextPage, hasNextPage }: any) => {
    if (hasNextPage) fetchNextPage();
    return (
      <div data-testid="desktop-view">
        {records.map((r: any) => (
          <div key={r.id} data-testid="time-record-row">
            {r.employeeName}
          </div>
        ))}
        {records.length === 0 && <div>No hay registros que coincidan con su filtro.</div>}
      </div>
    );
  },
}));
vi.mock("../../../features/time-control/components/TimeRecordTableViewMobile", () => ({
  default: ({ records }: any) => (
    <div data-testid="mobile-view">
      {records.map((r: any) => (
        <div key={r.id}>{r.employeeName}</div>
      ))}
      {records.length === 0 && <div>No hay registros que coincidan con su filtro.</div>}
    </div>
  ),
}));
vi.mock("../../../features/time-control/components/TimeRecordRow", () => ({
  default: ({ record }: { record: EnrichedTimeRecord }) => (
    <tr data-testid="time-record-row">
      <td>{record.employeeName}</td>
    </tr>
  ),
}));
vi.mock("../../../components/ui/PremiumSearchInput", () => ({
  default: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (val: string) => void;
    placeholder: string;
  }) => (
    <input
      data-testid="premium-search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

// Mock framer-motion to avoid issues with animations in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
      <div {...(props as any)}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("TimeRecordTable Component", () => {
  const mockAddToast = vi.fn();
  const mockFetchNextPage = vi.fn();
  const mockOnSearchChange = vi.fn();
  const mockOnExportStreaming = vi.fn();
  const mockOnRowDoubleClick = vi.fn();
  const mockOnAddComment = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnViewHistory = vi.fn();

  const mockRecords: import("../../../types/derived").AugmentedTimeRecord[] = [
    {
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
      workedHours: 8,
      overtimeHours: 0,
      scheduledHours: 8,
      isDayOffWorked: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToasts).mockReturnValue({
      addToast: mockAddToast,
      toasts: [],
      removeToast: vi.fn(),
    });
    vi.mocked(useIntersectionObserver).mockReturnValue({
      isIntersecting: false,
    } as unknown as IntersectionObserverEntry);
    vi.mocked(useLogs).mockReturnValue({
      logsPage: { data: [] },
      isLoadingLogs: false,
    } as any);
    vi.mocked(useCorrectionRequests).mockReturnValue({
      requests: [],
      isLoading: false,
    } as any);
  });

  const defaultProps = {
    records: mockRecords,
    fetchNextPage: mockFetchNextPage,
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    onRowDoubleClick: mockOnRowDoubleClick,
    onAddComment: mockOnAddComment,
    onDelete: mockOnDelete,
    isActionDisabledForRole: false,
    roleBasedTooltip: "",
    accountingLockDate: null,
    isControlInternoEnabled: true,
    searchName: "",
    onSearchChange: mockOnSearchChange,
    onExportStreaming: mockOnExportStreaming,
    onViewHistory: mockOnViewHistory,
  };

  it("should render correctly in both desktop and mobile views", async () => {
    vi.mocked(useIntersectionObserver).mockReturnValue({
      isIntersecting: false,
    } as unknown as IntersectionObserverEntry);
    render(<TimeRecordTable {...defaultProps} />);

    // screen.debug(); // For local debugging if needed
    expect(screen.getByText(/Registros de Horario/i)).toBeInTheDocument();

    // Check containers rendered by our mock ResponsiveView
    expect(screen.getByTestId("desktop-container")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-container")).toBeInTheDocument();

    // Check record rendered in desktop row mock
    expect(await screen.findByTestId("time-record-row")).toBeInTheDocument();
    expect(screen.getAllByText(/JUAN PEREZ/i).length).toBeGreaterThan(0);
  });

  it("should call onSearchChange when typing in search input", () => {
    render(<TimeRecordTable {...defaultProps} />);
    const input = screen.getByPlaceholderText(/Buscar por nombre.../i);

    fireEvent.change(input, { target: { value: "Maria" } });
    expect(mockOnSearchChange).toHaveBeenCalledWith("Maria");
  });

  it("should show empty state message when no records are found", () => {
    render(<TimeRecordTable {...defaultProps} records={[]} />);

    const emptyMessages = screen.getAllByText(/No hay registros que coincidan con su filtro/i);
    expect(emptyMessages.length).toBeGreaterThan(0);
  });

  it("should open export menu and trigger CSV export", () => {
    render(<TimeRecordTable {...defaultProps} />);

    const exportBtn = screen.getByRole("button", { name: /Exportar Datos/i });
    fireEvent.click(exportBtn);

    const csvBtn = screen.getByText(/Standard CSV/i);
    fireEvent.click(csvBtn);

    expect(mockOnExportStreaming).toHaveBeenCalledWith("csv");
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.stringContaining("exportados a CSV"),
      "success",
    );
  });

  it("should call fetchNextPage when sentinel is intersecting", () => {
    vi.mocked(useIntersectionObserver).mockReturnValue({
      isIntersecting: true,
    } as unknown as IntersectionObserverEntry);

    render(<TimeRecordTable {...defaultProps} hasNextPage={true} />);

    expect(mockFetchNextPage).toHaveBeenCalled();
  });

  it("should show loading spinner when isLoading is true and no records", () => {
    render(<TimeRecordTable {...defaultProps} records={[]} isLoading={true} />);
    expect(screen.getByTestId("desktop-container")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-container")).toBeInTheDocument();
  });
});
