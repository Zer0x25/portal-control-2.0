/* UI-PROTECTED: EDIT ONLY WITH HUMAN APPROVAL
   Presentational layer for Supervisor Dashboard.
   Follows the Golden Path standardization.
*/

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "../../../components/ui/PageHeader";
import { ShieldIcon, ActivityIcon } from "../../../components/ui/icons";

export interface SupervisorDashboardViewProps {
  activeTab: string;
  tabs: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }>;
  handleTabClick: (tabId: string) => void;
  renderContent: () => React.ReactNode;
}

export const SupervisorDashboardView: React.FC<SupervisorDashboardViewProps> = ({
  activeTab,
  tabs,
  handleTabClick,
  renderContent,
}) => {
  return (
    <div data-ui-protected className="supervisor-dashboard-ui-protected space-y-6">
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Header Premium - Estilo Auditoría */}
          <PageHeader
            icon={<ShieldIcon className="h-4 w-4" />}
            title="Control y Supervisión"
            subtitle="Monitoreo de parámetros operativos en tiempo real"
            eyebrow="Operaciones"
            eyebrowIcon={<ActivityIcon className="w-3.5 h-3.5" />}
          />

          {/* Tab Switcher - Replicando GovernanceHub Design */}
          <div className="flex border-b border-token-border-technical gap-8 overflow-x-auto scrollbar-hide">
            <div className="flex min-w-max gap-8">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`pb-4 px-1 flex items-center gap-2.5 transition-all relative ${
                      isActive
                        ? "text-[var(--sidebar-text-active)]"
                        : "text-token-text-tertiary hover:text-token-text-primary"
                    }`}
                  >
                    <TabIcon className={`w-4 h-4 ${isActive ? "opacity-100" : "opacity-60"}`} />
                    <span className="text-[11px] font-bold uppercase tracking-widest">
                      {tab.label}
                    </span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="bg-[var(--sidebar-text-active)] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                        {tab.badge}
                      </span>
                    )}
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--sidebar-text-active)] shadow-[0_-2px_8px_rgba(var(--sidebar-text-active-rgb),0.3)]"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Main Content Area - Industrial Style */}
      <div className="relative">
        <div className="bg-token-surface-card border border-token-border-technical rounded-sm p-6 md:p-8 min-h-[65vh] shadow-sm">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default SupervisorDashboardView;
