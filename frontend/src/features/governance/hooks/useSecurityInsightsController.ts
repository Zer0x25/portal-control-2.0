import { useCallback, useEffect, useState } from "react";
import { healthService } from "../../../services/healthService";
import { AuditLog } from "../../../types";

interface SecurityStats {
  totalUsers: number;
  mfaUsers: number;
  mfaAdoption: number;
  criticalAlertsCount: number;
}

export const useSecurityInsightsController = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [alerts, setAlerts] = useState<AuditLog[]>([]);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await healthService.getSecurityInsights()) as {
        stats?: SecurityStats;
        recentAlerts?: AuditLog[];
      };
      if (data) {
        if (data.stats) setStats(data.stats);
        if (data.recentAlerts) setAlerts(data.recentAlerts);
      }
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
