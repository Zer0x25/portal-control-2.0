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
import TabNav from "../../../components/ui/TabNav";

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

      <TabNav
        variant="underline"
        ariaLabel="Secciones de configuración"
        testId="config-tabs"
        tabTestIdPrefix="config-tab"
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
