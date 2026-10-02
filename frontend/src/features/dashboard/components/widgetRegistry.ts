import { DashboardWidget, WidgetId, UserRole } from "../../../types";
import { MyStatusPanel } from "./MyStatusPanel";
import { AlertsPanel } from "./AlertsPanel";
import { TeamStatusPanel } from "./TeamStatusPanel";
import { LatestReportsPanel } from "./LatestReportsPanel";
import QuickActionsPanel from "./QuickActionsPanel";
import ToolsPanel from "./ToolsPanel";

const ALL_DASHBOARD_ROLES: UserRole[] = [
  "Reloj_Control",
  "Administrador",
  "Supervisor_Elevado",
  "Supervisor",
];

export const WIDGET_REGISTRY: DashboardWidget[] = [
  {
    id: "myStatus",
    title: "Mi Estado Actual",
    component: MyStatusPanel,
    defaultVisible: true,
    mobileVisible: false,
    roles: ALL_DASHBOARD_ROLES,
  },
  {
    id: "quickActions",
    title: "Acciones Rápidas",
    component: QuickActionsPanel,
    defaultVisible: true,
    mobileVisible: true,
    roles: ALL_DASHBOARD_ROLES,
  },
  {
    id: "tools",
    title: "Herramientas y Recursos",
    component: ToolsPanel,
    defaultVisible: true,
    mobileVisible: false,
    roles: ALL_DASHBOARD_ROLES,
  },
  {
    id: "alerts",
    title: "Alertas de Personal",
    component: AlertsPanel,
    defaultVisible: true,
    mobileVisible: true,
    roles: ALL_DASHBOARD_ROLES,
  },
  {
    id: "teamStatus",
    title: "Estado del Equipo",
    component: TeamStatusPanel,
    defaultVisible: true,
    mobileVisible: true,
    roles: ALL_DASHBOARD_ROLES,
  },
  {
    id: "latestReports",
    title: "Últimos Reportes de Turno",
    component: LatestReportsPanel,
    defaultVisible: true,
    mobileVisible: false,
    roles: ALL_DASHBOARD_ROLES,
    module: "controlInterno",
  },
];

export const WIDGET_MAP: Record<WidgetId, DashboardWidget> = WIDGET_REGISTRY.reduce(
  (acc, widget) => {
    acc[widget.id] = widget;
    return acc;
  },
  {} as Record<WidgetId, DashboardWidget>,
);
