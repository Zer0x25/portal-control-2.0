import React from "react";
import OverviewTab from "../components/OverviewTab";
import { withSupervisorDashboardLazy } from "../components/withSupervisorDashboardLazy";
import { SupervisorActiveTab } from "./useSupervisorDashboardTabs";

const KpisTab = withSupervisorDashboardLazy(() => import("../components/KpisTab"));
const ReportsTab = withSupervisorDashboardLazy(() => import("../components/ReportsTab"));
const RequestsTab = withSupervisorDashboardLazy(() => import("../components/RequestsTab"));
const AccountingClosureTab = withSupervisorDashboardLazy(
  () => import("../components/AccountingClosureTab"),
);
const AnalyticsTab = withSupervisorDashboardLazy(() => import("../components/AnalyticsTab"));

/**
 * Hook para manejar el rendering condicional del contenido del supervisor dashboard
 */
export const useSupervisorDashboardContent = (activeTab: SupervisorActiveTab) => {
  const renderContent = React.useCallback(() => {
    switch (activeTab) {
      case "dashboard":
        return <OverviewTab />;
      case "kpis":
        return <KpisTab />;
      case "reports":
        return <ReportsTab />;
      case "employees":
        return <RequestsTab />;
      case "shifts":
        return <AccountingClosureTab />;
      case "analytics":
        return <AnalyticsTab />;
      default:
        return null;
    }
  }, [activeTab]);

  return { renderContent };
};
