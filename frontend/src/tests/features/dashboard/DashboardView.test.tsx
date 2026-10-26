import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DashboardView from "../../../features/dashboard/views/Dashboard.view";
import type { DashboardWidget } from "../../../types/dashboard";

vi.mock("../../../features/dashboard/components/WelcomePanel", () => ({
  default: () => <h1 data-testid="welcome-panel">Welcome</h1>,
}));
vi.mock("../../../components/ui/LoadingSpinner", () => ({
  default: () => <div data-testid="loading-spinner" />,
}));
vi.mock("../../../features/dashboard/components/DashboardDeferredModals", () => ({
  DashboardQuickNotesModal: () => null,
  DashboardShiftReportModal: () => null,
}));
vi.mock("../../../components/ui/ConfirmationModal", () => ({ default: () => null }));
vi.mock("../../../components/ui/CinematicModal", () => ({ default: () => null }));
vi.mock("../../../notifications/components/AmbientReminderManager", () => ({
  default: () => null,
}));

const noop = vi.fn();
const WidgetFixture = () => <div data-testid="dashboard-widget">Widget content</div>;
const widget: DashboardWidget = {
  id: "quickActions",
  title: "Quick actions",
  component: WidgetFixture,
  defaultVisible: true,
  mobileVisible: true,
  roles: ["Administrador"],
};

const makeProps = (overrides: Partial<React.ComponentProps<typeof DashboardView>> = {}) => ({
  currentUser: null,
  modals: {
    showReportDetailsModal: null,
    showResponsibleUserClockOutConfirmation: false,
    quickActionRecord: null,
    isAnomaliesModalOpen: false,
    isPresentModalOpen: false,
  },
  isQuickNotesModalOpen: false,
  handleCloseQuickNotes: noop,
  actions: {
    closeReportDetailsModal: noop,
    closeResponsibleClockOutConfirmation: noop,
    confirmResponsibleClockOut: async () => true,
    closeAnomaliesModal: noop,
    closePresentModal: noop,
  },
  shiftReports: [],
  isLoadingReports: false,
  isLoadingOverview: false,
  teamStatus: { present: 0, total: 0, anomaliesCount: 0 },
  unscheduledPresent: [],
  visibleWidgets: [widget],
  widgetProps: {},
  quickActionModal: null,
  editTimestampModal: null,
  handlePresentEmployeeDoubleClick: noop,
  handleAnomalyRecordDoubleClick: noop,
  ...overrides,
});

describe("DashboardView startup readiness", () => {
  it.each([
    { label: "overview", props: { isLoadingOverview: true } },
    { label: "initial reports", props: { isLoadingReports: true } },
  ])("shows the welcome panel while $label are loading, without mounting widgets", ({ props }) => {
    render(<DashboardView {...makeProps(props)} />);

    expect(screen.getByTestId("welcome-panel")).toBeInTheDocument();
    expect(screen.getByText("Sincronizando Dashboard")).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-widget")).not.toBeInTheDocument();
  });

  it("renders widgets and removes the startup indicator after data is ready", () => {
    render(<DashboardView {...makeProps()} />);

    expect(screen.getByTestId("welcome-panel")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-widget")).toBeInTheDocument();
    expect(screen.queryByText("Sincronizando Dashboard")).not.toBeInTheDocument();
  });
});
