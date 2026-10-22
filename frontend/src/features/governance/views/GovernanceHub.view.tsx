import React, { Suspense } from "react";
import PageHeader from "../../../components/ui/PageHeader";
import Container from "../../../components/ui/Container";
import {
  ShieldIcon,
  ShieldCheckIcon,
  ActivityIcon,
  ClockIcon,
  KeyIcon,
  CogIcon,
} from "../../../components/ui/icons/index";
import LazySectionFallback from "../../../components/ui/LazySectionFallback";
import TabNav from "../../../components/ui/TabNav";

const IntegritySummaryView = React.lazy(() => import("../components/IntegritySummaryView"));
const SecurityInsightsView = React.lazy(() => import("../containers/SecurityInsights.container"));
const AuditLogsView = React.lazy(() => import("../containers/AuditLogsView.container"));
const SystemMaintenanceView = React.lazy(() => import("../containers/SystemMaintenance.container"));
const HealthStatusView = React.lazy(() => import("../components/HealthStatusView"));

export type GovernanceHubTabId = "integrity" | "security" | "audit" | "system" | "health";

export interface GovernanceHubViewProps {
  activeTab: GovernanceHubTabId;
  handleTabChange: (tabId: GovernanceHubTabId) => void;
}

const tabs: Array<{
  id: GovernanceHubTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "integrity", label: "Integridad", icon: ShieldCheckIcon },
  { id: "security", label: "Seguridad", icon: KeyIcon },
  { id: "audit", label: "Auditoría", icon: ClockIcon },
  { id: "system", label: "Mantenimiento", icon: CogIcon },
  { id: "health", label: "Salud", icon: ActivityIcon },
];

/* UI-PROTECTED: EDIT ONLY WITH HUMAN APPROVAL
   Presentational layer for Governance feature.
*/
export const GovernanceHubView: React.FC<GovernanceHubViewProps> = ({
  activeTab,
  handleTabChange,
}) => {
  return (
    <Container
      variant="wide"
      noPadding
      data-ui-protected
      className="space-y-6 animate-in fade-in duration-500"
    >
      <PageHeader
        title="Centro de Gobernanza & Seguridad"
        subtitle="Consola centralizada de integridad criptográfica, auditoría y control maestro"
        icon={<ShieldIcon className="w-5 h-5" />}
        eyebrow="Gobernanza"
        eyebrowIcon={<ActivityIcon className="w-3.5 h-3.5" />}
      />

      <TabNav
        variant="underline"
        ariaLabel="Secciones de gobernanza"
        testId="governance-tabs"
        tabTestIdPrefix="governance-tab"
        tabs={tabs.map((tab) => {
          const Icon = tab.icon;
          return {
            id: tab.id,
            label: tab.label,
            icon: <Icon className="w-4 h-4" />,
          };
        })}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <div className="min-h-[600px]">
        <div key={activeTab} className="animate-in fade-in slide-in-from-right-1">
          <Suspense fallback={<LazySectionFallback rows={6} className="py-6" />}>
            {activeTab === "integrity" && <IntegritySummaryView />}
            {activeTab === "security" && <SecurityInsightsView />}
            {activeTab === "audit" && <AuditLogsView />}
            {activeTab === "system" && <SystemMaintenanceView />}
            {activeTab === "health" && <HealthStatusView />}
          </Suspense>
        </div>
      </div>
    </Container>
  );
};
