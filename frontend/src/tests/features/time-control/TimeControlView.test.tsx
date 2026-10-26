import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TimeControlView from "../../../features/time-control/views/TimeControl.view";

vi.mock("../../../components/ui/ServerClock", () => ({
  default: () => <div>SERVER-CLOCK</div>,
}));

vi.mock("../../../features/time-control/components/ClockingPanel", () => ({
  default: () => <div>CLOCKING-PANEL</div>,
}));

vi.mock("../../../features/time-control/components/TimeRecordFilters", () => ({
  default: (props: { onApplyCustomFilters: () => void }) => (
    <button onClick={props.onApplyCustomFilters}>APPLY-FILTERS</button>
  ),
}));

vi.mock("../../../features/time-control/components/DeferredTimeRecordTable", () => ({
  default: (props: {
    isLoading: boolean;
    onExportStreaming: (format: "csv" | "excel") => void;
  }) => (
    <>
      <div data-testid="records-loading-state">{props.isLoading ? "loading" : "ready"}</div>
      <button onClick={() => props.onExportStreaming("csv")}>EXPORT-CSV</button>
    </>
  ),
}));

vi.mock("../../../features/time-control/components/RecordHistoryModal", () => ({
  default: () => <div>RECORD-HISTORY-MODAL</div>,
}));
vi.mock("../../../components/ui/ConfirmationModal", () => ({
  default: () => <div>CONFIRMATION-MODAL</div>,
}));
vi.mock("../../../features/time-control", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../features/time-control")>();
  return {
    ...actual,
    QuickActionModal: () => <div>QUICK-ACTION-MODAL</div>,
  };
});
vi.mock("../../../features/time-control/components/EditTimestampModal.container", () => ({
  default: () => <div>EDIT-TIMESTAMP-MODAL</div>,
}));
vi.mock("../../../features/time-control/components/AnomalyResolutionModal", () => ({
  default: () => <div>ANOMALY-RESOLUTION-MODAL</div>,
}));

describe("TimeControlView", () => {
  const baseProps: React.ComponentProps<typeof TimeControlView> = {
    isActionDisabledForRole: false,
    roleBasedTooltip: null,
    clientFilters: { name: "", area: "", workdayType: "", status: "", showAnomalies: false },
    dateFilters: { desde: "2026-03-01", hasta: "2026-03-03", is24h: true },
    handleClientFilterChange: vi.fn(),
    handleDateFilterChange: vi.fn(),
    handleQuickFilterClick: vi.fn(),
    handleApplyCustomFilters: vi.fn(),
    clearFilters: vi.fn(),
    filteredRecords: [],
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    handleRowDoubleClick: vi.fn(),
    handleAddCommentClick: vi.fn(),
    handleDeleteClick: vi.fn(),
    isAddNoveltyModalOpen: false,
    setIsAddNoveltyModalOpen: vi.fn(),
    noveltyInitialText: "",
    handleSaveNovelty: vi.fn(async () => undefined),
    modalState: { type: "none" },
    setModalState: vi.fn(),
    handleConfirmDelete: vi.fn(),
    editingRecordInfo: null,
    closeEditTimestampModal: vi.fn(),
    quickActionRecord: null,
    closeQuickActionModal: vi.fn(),
    quickActionClockStatus: null,
    handleEditClick: vi.fn(),
    isLoading: false,
    isApplyButtonEnabled: true,
    periodDisplayText: "Marzo 2026",
    activeQuickFilter: null,
    handleExportStreaming: vi.fn(),
    handleViewHistory: vi.fn(),
    totalRecords: 0,
    filtersKey: "key-1",
    isResolutionModalOpen: false,
    setIsResolutionModalOpen: vi.fn(),
    recordToResolve: null,
    handleResolveAnomalyClick: vi.fn(),
    handleConfirmResolution: vi.fn(async () => undefined),
    isProcessingResolution: false,
    isControlInternoEnabled: true,
    effectiveLockDate: "2026-03-01",
    isPageLoading: false,
    startBreak: vi.fn(async () => undefined),
    endBreak: vi.fn(async () => undefined),
    clockOut: vi.fn(async () => undefined),
  };

  it("renders loading state when page is loading", () => {
    render(<TimeControlView {...baseProps} isPageLoading={true} />);

    expect(screen.getByText("Optimizando registros de asistencia...")).toBeInTheDocument();
  });

  it("keeps the page header visible while the records table loads", () => {
    render(<TimeControlView {...baseProps} isLoading={true} />);

    expect(screen.getByText("Control de Asistencia")).toBeInTheDocument();
    expect(screen.getByTestId("records-loading-state")).toHaveTextContent("loading");
    expect(screen.queryByText("Optimizando registros de asistencia...")).not.toBeInTheDocument();
  });

  it("mounts the timestamp editor only when a record is selected for editing", async () => {
    const { rerender } = render(<TimeControlView {...baseProps} />);

    expect(screen.queryByText("EDIT-TIMESTAMP-MODAL")).not.toBeInTheDocument();

    const editingRecordInfo: NonNullable<
      React.ComponentProps<typeof TimeControlView>["editingRecordInfo"]
    > = {
      record: {
        id: "record-1",
        employeeId: "employee-1",
        employeeName: "JUAN PEREZ",
        employeePosition: "OPERADOR",
        employeeArea: "OPERACIONES",
        employeeWorkdayType: "Full Time",
        date: "2026-03-03",
        status: "Completado",
        entrada: "2026-03-03T08:00:00Z",
        lastModified: 1,
        syncStatus: "synced",
        isDeleted: false,
      },
      field: "entrada",
    };

    rerender(<TimeControlView {...baseProps} editingRecordInfo={editingRecordInfo} />);

    expect(await screen.findByText("EDIT-TIMESTAMP-MODAL")).toBeInTheDocument();
  });

  it("renders main content and delegates filter/export actions", () => {
    render(<TimeControlView {...baseProps} />);

    expect(screen.getByText("Control de Asistencia")).toBeInTheDocument();
    expect(screen.getByText("CLOCKING-PANEL")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "APPLY-FILTERS" }));
    expect(baseProps.handleApplyCustomFilters).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "EXPORT-CSV" }));
    expect(baseProps.handleExportStreaming).toHaveBeenCalledWith("csv");
  });
});
