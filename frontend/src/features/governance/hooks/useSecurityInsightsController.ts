import { useCallback, useEffect, useState } from "react";
import { authService } from "../../../services/authService";
import { API_BASE_URL } from "../../../services/apiBase";
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
      const response = await fetch(`${API_BASE_URL}/admin/security-insights`, {
        headers: authService.getAuthHeader(),
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data.stats);
        setAlerts(data.data.recentAlerts);
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
