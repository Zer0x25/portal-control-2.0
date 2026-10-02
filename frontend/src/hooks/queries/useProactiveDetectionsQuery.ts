import { useQuery } from "@tanstack/react-query";
import { auditLogService } from "../../services/auditLogService";
import { useAuth } from "../useAuth";
import { AuditLog } from "../../types/index";

export const useProactiveDetectionsQuery = () => {
  const { currentUser } = useAuth();
  const isAuthorized =
    currentUser?.role === "Administrador" || currentUser?.role === "Supervisor_Elevado";

  return useQuery({
    queryKey: ["audit-logs", "proactive-detections"],
    queryFn: async () => {
      if (!isAuthorized) return [];

      const response = await auditLogService.getAll({
        page: 1,
        pageSize: 5,
        filters: {
          severity: "CRITICAL",
          action: "DETECCION_BLOQUEO_PROACTIVA",
        },
        sortBy: "timestamp",
        sortOrder: "desc",
      });

      return (response.data || []) as AuditLog[];
    },
    enabled: isAuthorized,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Auto-refresh every 5 minutes
  });
};
