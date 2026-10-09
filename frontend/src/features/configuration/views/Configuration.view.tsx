import React, { Suspense } from "react";
import PageHeader from "../../../components/ui/PageHeader";
import {
  ShieldIcon,
  CogIcon,
  EnvelopeIcon,
  DocumentArrowDownIcon,
  ActivityIcon,
} from "../../../components/ui/icons/index";
import LazySectionFallback from "../../../components/ui/LazySectionFallback";
import Container from "../../../components/ui/Container";

const GlobalVariablesView = React.lazy(() => import("../components/GlobalVariablesView"));
const EmailCenterView = React.lazy(() => import("../components/EmailCenterView"));
const MasterDataExportView = React.lazy(() => import("../components/MasterDataExportView"));

export type ConfigurationTabId = "variables" | "email" | "master-data";

export interface ConfigurationViewProps {
  activeTab: ConfigurationTabId;
  handleTabChange: (tabId: ConfigurationTabId) => void;
}

const tabs: Array<{
  id: ConfigurationTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "variables", label: "Variables Globales", icon: ShieldIcon },
  { id: "email", label: "Centro de Correos", icon: EnvelopeIcon },
  { id: "master-data", label: "Exportación de Datos", icon: DocumentArrowDownIcon },
];

/* UI-PROTECTED: EDIT ONLY WITH HUMAN APPROVAL
   Presentational layer for Configuration feature.
*/
export const ConfigurationView: React.FC<ConfigurationViewProps> = ({
  activeTab,
  handleTabChange,
}) => {
  return (
    <Container
      variant="standard"
      noPadding
      data-ui-protected
      className="space-y-6 animate-in fade-in duration-500"
    >
      <PageHeader
        eyebrow="Sistema de Operaciones"
        eyebrowIcon={<ActivityIcon className="w-3.5 h-3.5" />}
        icon={<CogIcon className="w-4 h-4" />}
        title="Control de Sistema"
        subtitle="Configuración centralizada de variables, comunicaciones y exportación estratégica"
      />

      <div className="flex border-b border-token-border-technical gap-8 overflow-x-auto scrollbar-hide">
        <div className="flex min-w-max gap-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`pb-4 px-1 flex items-center gap-2.5 transition-colors relative ${
                  isActive
                    ? "text-(--sidebar-text-active)"
                    : "text-token-text-tertiary hover:text-token-text-primary"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "opacity-100" : "opacity-60"}`} />
                <span className="text-[11px] font-bold uppercase tracking-widest">{tab.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-(--sidebar-text-active) shadow-[0_-2px_8px_rgba(var(--sidebar-text-active-rgb),0.3)] animate-in fade-in" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative">
        <div className="bg-token-surface-card border border-token-border-technical rounded-sm p-6 md:p-8 min-h-[65vh] shadow-sm">
          <div key={activeTab} className="animate-in fade-in slide-in-from-top-2">
            <Suspense fallback={<LazySectionFallback rows={5} className="py-6" />}>
              {activeTab === "variables" && <GlobalVariablesView />}
              {activeTab === "email" && <EmailCenterView />}
              {activeTab === "master-data" && <MasterDataExportView />}
            </Suspense>
          </div>
        </div>
      </div>
    </Container>
  );
};
