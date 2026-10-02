import React from "react";
import { SupervisorDashboardView } from "../views/SupervisorDashboard.view";

// Hooks separados para lógica
import { useSupervisorDashboardTabs } from "../hooks/useSupervisorDashboardTabs";
import { useSupervisorDashboardData } from "../hooks/useSupervisorDashboardData";
import { useSupervisorDashboardTabsConfig } from "../hooks/useSupervisorDashboardTabsConfig";
import { useSupervisorDashboardContent } from "../hooks/useSupervisorDashboardContent";

/**
 * SupervisorDashboardPage - Página principal del dashboard supervisor
 *
 * Arquitectura "Golden Path":
 * - Container: Orquestación de hooks
 * - View: Renderizado puro de UI (UI-PROTECTED)
 * - Hooks: Lógica de negocio y estado
 */
const SupervisorDashboardPage: React.FC = () => {
  // Lógica de navegación y tabs
  const { activeTab, handleTabClick } = useSupervisorDashboardTabs();

  // Datos del dashboard
  const { requestCount } = useSupervisorDashboardData();

  // Configuración de tabs
  const { tabs } = useSupervisorDashboardTabsConfig(requestCount);

  // Rendering de contenido
  const { renderContent } = useSupervisorDashboardContent(activeTab);

  return (
    <SupervisorDashboardView
      activeTab={activeTab}
      handleTabClick={handleTabClick}
      tabs={tabs}
      renderContent={renderContent}
    />
  );
};

export default SupervisorDashboardPage;
