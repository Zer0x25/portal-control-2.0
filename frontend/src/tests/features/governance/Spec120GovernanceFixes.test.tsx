import React from "react";
import { render, screen, fireEvent, waitFor, act, renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GovernanceHubView } from "../../../features/governance/views/GovernanceHub.view";
import IntegritySummaryView from "../../../features/governance/components/IntegritySummaryView";
import { SecurityInsightsView } from "../../../features/governance/views/SecurityInsights.view";
import { useSecurityInsightsController } from "../../../features/governance/hooks/useSecurityInsightsController";
import { useAuditLogsController } from "../../../features/governance/hooks/useAuditLogsController";
import { useAuditLogMutations } from "../../../hooks/useAuditLogMutations";
import AuditLogsViewView from "../../../features/governance/views/AuditLogsView.view";
import ExportLogsModal from "../../../features/governance/components/ExportLogsModal";
import { BackupListModalView } from "../../../features/governance/views/BackupListModal.view";
import HealthStatusView from "../../../features/governance/components/HealthStatusView";
import { ROLES } from "../../../utils/mappings";
import type { AuditLog } from "../../../types";

const {
  addToastMock,
  getSecurityInsightsMock,
  verifyIntegrityMock,
  useAuditLogsInfiniteMock,
  useHealthQueryMock,
  authState,
} = vi.hoisted(() => ({
  addToastMock: vi.fn(),
  getSecurityInsightsMock: vi.fn(),
  verifyIntegrityMock: vi.fn(),
  useAuditLogsInfiniteMock: vi.fn(),
  useHealthQueryMock: vi.fn(),
  authState: { currentUser: { id: "u1", username: "admin", role: "Super_Administrador" } },
}));

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => authState,
}));

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: addToastMock }),
}));

vi.mock("../../../store/useStore", () => ({
  useStore: (selector: (s: { addToast: typeof addToastMock }) => unknown) =>
    selector({ addToast: addToastMock }),
}));

vi.mock("../../../services/healthService", () => ({
  healthService: {
    getSecurityInsights: (...args: unknown[]) => getSecurityInsightsMock(...args),
  },
}));

vi.mock("../../../services/auditLogService", () => ({
  auditLogService: {
    verifyIntegrity: (...args: unknown[]) => verifyIntegrityMock(...args),
    cleanup: vi.fn(),
  },
}));

vi.mock("../../../hooks/queries/useIntegrityStatus", () => ({
  useIntegrityStatus: () => ({ data: { status: "ok", lastCheckedCount: 10, lastBrokenCount: 0 } }),
  useRefreshIntegrityStatus: () => vi.fn(),
}));

vi.mock("../../../hooks/queries/useAuditLogsInfinite", () => ({
  useAuditLogsInfinite: (...args: unknown[]) => useAuditLogsInfiniteMock(...args),
}));

vi.mock("../../../hooks/queries/useHealthQuery", () => ({
  useHealthQuery: (...args: unknown[]) => useHealthQueryMock(...args),
}));

vi.mock("../../../hooks/useMediaQuery", () => ({
  useMediaQuery: () => false,
}));

vi.mock("../../../hooks/useBusinessNow", () => ({
  useBusinessNow: () => new Date("2026-11-18T12:00:00Z").getTime(),
}));

vi.mock("../../../hooks/useDebounce", () => ({
  useDebounce: <T,>(val: T) => val,
}));

vi.mock("../../../features/governance/components/AuditLogDetailDrawer", () => ({
  default: ({ log }: { log: AuditLog | null }) =>
    log ? <div data-testid="audit-detail-drawer">{log.action}</div> : null,
}));

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe("Spec 120 Frontend Governance Fixes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.currentUser = { id: "u1", username: "admin", role: ROLES.ADMIN };
    useAuditLogsInfiniteMock.mockReturnValue({
      data: { pages: [{ data: [], total: 0 }] },
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
    });
    useHealthQueryMock.mockReturnValue({
      data: {
        status: "healthy",
        database: { status: "OK" },
        responseTime: 12,
        timestamp: "2026-11-18T12:00:00.000Z",
        instanceId: "inst-1",
      },
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  it("FE-1: GovernanceHubView hides security and system tabs when allowedTabs excludes them", () => {
    render(
      <GovernanceHubView
        activeTab="integrity"
        allowedTabs={["integrity", "audit", "health"]}
        handleTabChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Integridad")).toBeInTheDocument();
    expect(screen.getByText("Auditoría")).toBeInTheDocument();
    expect(screen.getByText("Salud")).toBeInTheDocument();
    expect(screen.queryByText("Seguridad")).not.toBeInTheDocument();
    expect(screen.queryByText("Mantenimiento")).not.toBeInTheDocument();
  });

  it("FE-1: IntegritySummaryView hides deep audit button for Fiscalizador", () => {
    authState.currentUser = { id: "u2", username: "auditor", role: ROLES.AUDITOR };
    render(<IntegritySummaryView />, { wrapper: createWrapper() });
    expect(screen.queryByText("Ejecutar Auditoría Profunda")).not.toBeInTheDocument();

    authState.currentUser = { id: "u1", username: "admin", role: ROLES.ADMIN };
    render(<IntegritySummaryView />, { wrapper: createWrapper() });
    expect(screen.getByText("Ejecutar Auditoría Profunda")).toBeInTheDocument();
  });

  it("FE-1: SecurityInsights handles fetch errors with visible error state and toast", async () => {
    getSecurityInsightsMock.mockRejectedValueOnce(new Error("Acceso denegado (403)"));
    const { result } = renderHook(() => useSecurityInsightsController());

    await waitFor(() => {
      expect(result.current.error).toBe("Acceso denegado (403)");
    });
    expect(addToastMock).toHaveBeenCalledWith("Acceso denegado (403)", "error");

    const retryMock = vi.fn().mockResolvedValue(undefined);
    render(
      <SecurityInsightsView
        loading={false}
        error={result.current.error}
        stats={null}
        alerts={[]}
        fetchInsights={retryMock}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Acceso denegado (403)");
    fireEvent.click(screen.getByRole("button", { name: /Reintentar/i }));
    expect(retryMock).toHaveBeenCalledTimes(1);
  });

  it("FE-2: useAuditLogsController passes action filter to useAuditLogsInfinite", () => {
    const { result } = renderHook(() => useAuditLogsController());

    act(() => {
      result.current.setFilters((prev) => ({ ...prev, action: "LOGIN_FAILED" }));
    });

    expect(result.current.queryParams.filters.action).toBe("LOGIN_FAILED");
    expect(useAuditLogsInfiniteMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({ action: "LOGIN_FAILED" }),
      }),
    );
  });

  it("FE-2: useAuditLogMutations reads data.data?.message for verifyIntegrity toast", async () => {
    verifyIntegrityMock.mockResolvedValueOnce({
      success: true,
      data: { message: "Verificación completada sin anomalías" },
    });

    const { result } = renderHook(() => useAuditLogMutations(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.verifyIntegrity.mutateAsync();
    });

    expect(addToastMock).toHaveBeenCalledWith("Verificación completada sin anomalías", "success");
  });

  it("FE-3: AuditLogsViewView renders EmptyState when no logs and supports keyboard row activation", () => {
    const setSelectedLog = vi.fn();
    const baseController = {
      isMobile: false,
      businessNow: new Date("2026-11-18T12:00:00Z"),
      isExportModalOpen: false,
      setIsExportModalOpen: vi.fn(),
      isFiltersOpen: false,
      setIsFiltersOpen: vi.fn(),
      activeDate: new Date("2026-11-18T12:00:00Z"),
      setActiveDate: vi.fn(),
      selectedLog: null,
      setSelectedLog,
      filters: {
        categories: [],
        severities: [],
        outcomes: [],
        actorUsername: "",
        action: "",
        startDate: "",
        endDate: "",
      },
      setFilters: vi.fn(),
      debouncedFilters: {
        categories: [],
        severities: [],
        outcomes: [],
        actorUsername: "",
        action: "",
        startDate: "",
        endDate: "",
      },
      queryParams: { pageSize: 100, filters: {} },
      data: undefined,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      allLogs: [],
      totalLogs: 0,
      parentRef: { current: null },
      rowVirtualizer: {
        getTotalSize: () => 0,
        getVirtualItems: () => [],
      } as never,
      virtualItems: [],
    };

    const { rerender } = render(<AuditLogsViewView {...baseController} />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText("Sin registros de auditoría")).toBeInTheDocument();

    const sampleLog: AuditLog = {
      id: "log-1",
      timestamp: "2026-11-18T12:00:00.000Z",
      actorUsername: "admin",
      action: "USER_UPDATED",
      category: "SYSTEM",
      severity: "INFO",
      outcome: "SUCCESS",
      lastModified: Date.now(),
      syncStatus: "synced",
      isDeleted: false,
    };

    rerender(
      <AuditLogsViewView
        {...baseController}
        allLogs={[sampleLog]}
        totalLogs={1}
        virtualItems={[{ key: 0, index: 0, start: 0, size: 48, end: 48, lane: 0 }]}
      />,
    );

    const row = screen.getByRole("button", { name: /admin/i });
    fireEvent.keyDown(row, { key: "Enter" });
    expect(setSelectedLog).toHaveBeenCalledWith(sampleLog);

    fireEvent.keyDown(row, { key: " " });
    expect(setSelectedLog).toHaveBeenCalledTimes(2);
  });

  it("FE-3: ExportLogsModal exposes dialog role and closes on Escape", () => {
    const onClose = vi.fn();
    render(<ExportLogsModal isOpen={true} onClose={onClose} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("FE-4: BackupListModalView renders ConfirmationModal when pendingRestoreFilename is set", () => {
    const confirmRestore = vi.fn().mockResolvedValue(undefined);
    const cancelRestore = vi.fn();

    render(
      <BackupListModalView
        isOpen={true}
        onClose={vi.fn()}
        backups={[]}
        loading={false}
        restoring={null}
        pendingRestoreFilename="backup-pg-2026.sql.gz"
        error={null}
        handleRestore={vi.fn()}
        cancelRestore={cancelRestore}
        confirmRestore={confirmRestore}
      />,
    );

    expect(screen.getByText("Confirmar Restauración de Base de Datos")).toBeInTheDocument();
    expect(screen.getByText(/backup-pg-2026\.sql\.gz/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sobrescribir Base de Datos" }));
    expect(confirmRestore).toHaveBeenCalledTimes(1);
  });

  it("FE-4: HealthStatusView tolerates minimal public /api/health payload", () => {
    render(<HealthStatusView />);

    expect(screen.getByText("OPERATIVO")).toBeInTheDocument();
    expect(screen.getByText("12 ms")).toBeInTheDocument();
    expect(screen.getByText("Resumen de Disponibilidad")).toBeInTheDocument();
    expect(screen.getAllByText("inst-1").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/Núcleos/)).not.toBeInTheDocument();
  });
});
