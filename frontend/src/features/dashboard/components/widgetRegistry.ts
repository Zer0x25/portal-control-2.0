import React from "react";
import { DashboardWidget, WidgetId, UserRole } from "../../../types";
import { RenderProfiler } from "../../../utils/RenderProfiler";
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

const profileWidget = (
  id: WidgetId,
  Component: React.ComponentType<unknown>,
): React.ComponentType<unknown> => {
  if (!import.meta.env.DEV) return Component;

  const ProfiledWidget: React.FC<unknown> = (props) =>
    React.createElement(RenderProfiler, {
      id: `widget:${id}`,
      children: React.createElement(Component, props as Record<string, unknown>),
    });
  ProfiledWidget.displayName = `ProfiledDashboardWidget(${id})`;
  return ProfiledWidget;
};

export const WIDGET_REGISTRY: DashboardWidget[] = [
  {
    id: "myStatus",
    title: "Mi Estado Actual",
    component: profileWidget("myStatus", MyStatusPanel),
    defaultVisible: true,
    mobileVisible: false,
    roles: ALL_DASHBOARD_ROLES,
  },
  {
    id: "quickActions",
    title: "Acciones Rápidas",
    component: profileWidget("quickActions", QuickActionsPanel),
    defaultVisible: true,
    mobileVisible: true,
    roles: ALL_DASHBOARD_ROLES,
  },
  {
    id: "tools",
    title: "Herramientas y Recursos",
    component: profileWidget("tools", ToolsPanel),
    defaultVisible: true,
    mobileVisible: false,
    roles: ALL_DASHBOARD_ROLES,
  },
  {
    id: "alerts",
    title: "Alertas de Personal",
    component: profileWidget("alerts", AlertsPanel),
    defaultVisible: true,
    mobileVisible: true,
    roles: ALL_DASHBOARD_ROLES,
  },
  {
    id: "teamStatus",
    title: "Estado del Equipo",
    component: profileWidget("teamStatus", TeamStatusPanel),
    defaultVisible: true,
    mobileVisible: true,
    roles: ALL_DASHBOARD_ROLES,
  },
  {
    id: "latestReports",
    title: "Últimos Reportes de Turno",
    component: profileWidget("latestReports", LatestReportsPanel),
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
