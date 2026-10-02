import { useState, useCallback, useEffect, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { SupervisorTab } from "../../../types/supervisor";

export type SupervisorActiveTab = SupervisorTab;

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
  const validTabs = useMemo<SupervisorActiveTab[]>(
    () => ["dashboard", "analytics", "kpis", "reports", "employees", "shifts"],
    [],
  );

  // Memoizar tab inicial para evitar cálculos innecesarios
  const initialTab = useMemo<SupervisorActiveTab>(() => {
    return tabParam && validTabs.includes(tabParam) ? tabParam : "dashboard";
  }, [tabParam, validTabs]);

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
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam, validTabs]);

  // Callback memoizado para cambios de tab
  const handleTabClick = useCallback(
    (tab: string) => {
      const tabId = tab as SupervisorActiveTab;
      if (validTabs.includes(tabId)) {
        setActiveTab(tabId);
        setSearchParams({ tab: tabId });
      }
    },
    [setSearchParams, validTabs],
  );

  // Memoizar valores de retorno para estabilidad de referencias
  return useMemo(
    () => ({
      activeTab,
      handleTabClick,
      validTabs,
    }),
    [activeTab, handleTabClick, validTabs],
  );
};
