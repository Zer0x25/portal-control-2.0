import { useCallback, useEffect, useState } from "react";
import { healthService, type SecurityInsights } from "../../../services/healthService";
import { AuditLog } from "../../../types";
import { logger } from "../../../utils/logger";

export const useSecurityInsightsController = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<SecurityInsights["stats"] | null>(null);
  const [alerts, setAlerts] = useState<AuditLog[]>([]);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      const data = await healthService.getSecurityInsights();
      setStats(data.stats);
      setAlerts(data.recentAlerts);
    } catch (error) {
      logger.error("Error fetching security insights:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return {
    loading,
    stats,
    alerts,
    fetchInsights,
  };
};
