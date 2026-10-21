import { useCallback, useEffect, useState } from "react";
import { healthService, type SecurityInsights } from "../../../services/healthService";
import { AuditLog } from "../../../types";

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
      console.error("Error fetching security insights:", error);
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
