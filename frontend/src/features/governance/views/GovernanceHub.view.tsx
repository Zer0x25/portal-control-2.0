import React, { Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

const IntegritySummaryView = React.lazy(() => import("../components/IntegritySummaryView"));
const SecurityInsightsView = React.lazy(() => import("../components/SecurityInsightsView"));
const AuditLogsView = React.lazy(() => import("../components/AuditLogsView"));
const SystemMaintenanceView = React.lazy(() => import("../components/SystemMaintenanceView"));
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

      <div className="flex border-b border-token-border-technical gap-8 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`pb-4 px-1 flex items-center gap-2.5 transition-all relative ${
                isActive
                  ? "text-(--sidebar-text-active)"
                  : "text-token-text-tertiary hover:text-token-text-primary"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "opacity-100" : "opacity-60"}`} />
              <span className="text-[11px] font-bold uppercase tracking-widest">{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-(--sidebar-text-active) shadow-[0_-2px_8px_rgba(var(--sidebar-text-active-rgb),0.3)]"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="min-h-[600px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Suspense fallback={<LazySectionFallback rows={6} className="py-6" />}>
              {activeTab === "integrity" && <IntegritySummaryView />}
              {activeTab === "security" && <SecurityInsightsView />}
              {activeTab === "audit" && <AuditLogsView />}
              {activeTab === "system" && <SystemMaintenanceView />}
              {activeTab === "health" && <HealthStatusView />}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>
    </Container>
  );
};
