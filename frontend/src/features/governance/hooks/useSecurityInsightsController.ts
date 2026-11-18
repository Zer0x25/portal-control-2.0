import { useCallback, useEffect, useState } from "react";
import { healthService, type SecurityInsights } from "../../../services/healthService";
import { useToasts } from "../../../hooks/useToasts";
import { AuditLog } from "../../../types";
import { logger } from "../../../utils/logger";

export const useSecurityInsightsController = () => {
  const { addToast } = useToasts();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SecurityInsights["stats"] | null>(null);
  const [alerts, setAlerts] = useState<AuditLog[]>([]);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await healthService.getSecurityInsights();
      setStats(data.stats);
      setAlerts(data.recentAlerts);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudieron cargar los insights de seguridad.";
      setError(message);
      addToast(message, "error");
      logger.error("Error fetching security insights:", err);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return {
    loading,
    error,
    stats,
    alerts,
    fetchInsights,
  };
};
