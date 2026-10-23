import { useCorrectionRequestsStatsQuery } from "./queries/useCorrectionRequestsStatsQuery";
import { useProactiveDetectionsQuery } from "./queries/useProactiveDetectionsQuery";
import { ROUTES } from "../constants";
import { NotificationItem } from "../types";

/**
 * `AuditLog.details` is a free-form record; only a string `message` is usable as
 * notification copy, so anything else falls back to the generic text.
 */
const getDetectionMessage = (details: Record<string, unknown> | undefined): string => {
  const message = details?.message;
  return typeof message === "string" ? message : "Atención requerida en el periodo.";
};

export const useNotifications = () => {
  const { data: stats } = useCorrectionRequestsStatsQuery();
  const { data: proactiveDetections } = useProactiveDetectionsQuery();

  const combined: NotificationItem[] = [];

  // Add proactive detections as alerts
  if (proactiveDetections && proactiveDetections.length > 0) {
    proactiveDetections.forEach((log) => {
      combined.unshift({
        id: `alert-${log.id}`,
        type: "alert",
        title: "SISTEMA: Alerta de Integridad",
        message: typeof log.details === "string" ? log.details : getDetectionMessage(log.details),
        timestamp: new Date(log.timestamp).getTime(),
        link: ROUTES.SUPERVISOR_DASHBOARD, // Target tab will be handled in NotificationCenter
        isRead: false,
      });
    });
  }

  if (stats?.pending && stats.pending > 0) {
    combined.unshift({
      id: "pending-corrections-notif",
      type: "request",
      title: "Pendientes de Corrección",
      message: `Hay ${stats.pending} solicitudes de corrección esperando revisión.`,
      timestamp: Date.now(),
      link: ROUTES.SUPERVISOR_DASHBOARD,
      isRead: false,
    });
  }

  const notifications = combined;

  const alertCount = proactiveDetections?.length || 0;
  const unreadCount = (stats?.pending && stats.pending > 0 ? 1 : 0) + alertCount;

  return { notifications, unreadCount };
};
