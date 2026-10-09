import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SecurityInsightsView } from "../../../features/governance/views/SecurityInsights.view";
import { SystemMaintenanceView } from "../../../features/governance/views/SystemMaintenance.view";
import { BackupListModalView } from "../../../features/governance/views/BackupListModal.view";

vi.mock("../../../components/layout/HealthDashboard", () => ({
  default: () => <div data-testid="mock-health-dashboard">HealthDashboard</div>,
}));

vi.mock("../../../features/governance/components/BackupListModal", () => ({
  default: () => <div data-testid="mock-backup-list-modal">BackupListModal</div>,
}));

vi.mock("../../../components/ui/CinematicModal", () => ({
  default: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) =>
    isOpen ? <div data-testid="mock-cinematic-modal">{children}</div> : null,
}));

describe("Governance Sub-Views Canonical Container Coverage", () => {
  it("renders SecurityInsightsView inside canonical standard Container with data-ui-protected", () => {
    render(
      <SecurityInsightsView
        loading={false}
        stats={{
          totalUsers: 10,
          mfaUsers: 8,
          mfaAdoption: 80,
          criticalAlertsCount: 0,
        }}
        alerts={[]}
        fetchInsights={vi.fn()}
      />,
    );

    const container = screen.getByTestId("page-container");
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass("max-w-7xl");
    expect(container).toHaveAttribute("data-ui-protected");
  });

  it("renders SystemMaintenanceView inside canonical standard Container with data-ui-protected", () => {
    render(
      <SystemMaintenanceView
        stats={{
          usersCount: 5,
          employeesCount: 10,
          activeEmployeesCount: 8,
          recordsCount: 100,
          todayRecordsCount: 20,
          auditLogsCount: 50,
          criticalLogsCount: 2,
          mfaStats: { enabled: 4, disabled: 1 },
        }}
        diagnosis={null}
        loading={false}
        isRunningBackup={false}
        isPurgingSessions={false}
        isResettingPassword={false}
        isResettingDatabase={false}
        isTriggeringAccountingAutoClose={false}
        purgeUsername=""
        resetUsername=""
        newPassword=""
        isBackupListOpen={false}
        setPurgeUsername={vi.fn()}
        setResetUsername={vi.fn()}
        setNewPassword={vi.fn()}
        setIsBackupListOpen={vi.fn()}
        handleDiagnose={vi.fn()}
        handleTriggerAutoClose={vi.fn()}
        handleTriggerBackup={vi.fn()}
        handlePurgeSessions={vi.fn()}
        handleResetPassword={vi.fn()}
        handleMasterReset={vi.fn()}
        handleTriggerAccountingAutoClose={vi.fn()}
        handleRestartBackend={vi.fn()}
      />,
    );

    const container = screen.getByTestId("page-container");
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass("max-w-7xl");
    expect(container).toHaveAttribute("data-ui-protected");
  });

  it("renders BackupListModalView inside canonical standard Container with data-ui-protected", () => {
    render(
      <BackupListModalView
        isOpen={true}
        onClose={vi.fn()}
        backups={[]}
        loading={false}
        restoring={null}
        error={null}
        handleRestore={vi.fn()}
      />,
    );

    const container = screen.getByTestId("page-container");
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass("max-w-7xl");
    expect(container).toHaveAttribute("data-ui-protected");
  });
});
