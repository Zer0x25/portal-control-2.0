import { useState, useEffect } from "react";
import { useLocation, useSearchParams } from "react-router";
import { SupervisorTab } from "../../../types/supervisor";

export type SupervisorActiveTab = SupervisorTab;

const VALID_SUPERVISOR_TABS = [
  "dashboard",
  "analytics",
  "kpis",
  "reports",
  "employees",
  "shifts",
] as SupervisorActiveTab[];

export interface SupervisorTabConfig {
  id: SupervisorActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  requiredPermission?: string;
}

/**
 * Hook optimizado para manejar la lógica de navegación y estado de tabs del supervisor dashboard
 * Incluye memoización para mejor performance y validación de permisos consistente
 */
export const useSupervisorDashboardTabs = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as SupervisorActiveTab | null;

  // Memoizar lista de tabs válidos para evitar recreación en cada render
  // Memoizar tab inicial para evitar cálculos innecesarios
  const initialTab =
    tabParam && VALID_SUPERVISOR_TABS.includes(tabParam)
      ? tabParam
      : ("dashboard" as SupervisorActiveTab);

  const [activeTab, setActiveTab] = useState<SupervisorActiveTab>(initialTab);

  // Efecto optimizado para manejar navegación desde location state
  useEffect(() => {
    if (location.state?.openRequestsTab) {
      setActiveTab("employees");
      setSearchParams({ tab: "employees" });
    } else if (location.state?.openAccountingTab) {
      setActiveTab("reports");
      setSearchParams({ tab: "reports" });
    }
  }, [location.state, setSearchParams]);

  // Efecto optimizado para sincronizar con URL params
  useEffect(() => {
    if (tabParam && VALID_SUPERVISOR_TABS.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Callback memoizado para cambios de tab
  const handleTabClick = (tab: string) => {
    const tabId = tab as SupervisorActiveTab;
    if (VALID_SUPERVISOR_TABS.includes(tabId)) {
      setActiveTab(tabId);
      setSearchParams({ tab: tabId });
    }
  };

  // Memoizar valores de retorno para estabilidad de referencias
  return {
    activeTab,
    handleTabClick,
    validTabs: VALID_SUPERVISOR_TABS,
  };
};
