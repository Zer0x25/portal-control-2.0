import { useState, useEffect } from "react";
import { API_ORIGIN_URL } from "../services/apiBase";

export type SystemStatus = "online" | "offline" | "degraded";

interface UseSystemStatusReturn {
  isOnline: boolean;
  status: SystemStatus;
  checkHealth: () => Promise<void>;
}

export const useSystemStatus = (): UseSystemStatusReturn => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [status, setStatus] = useState<SystemStatus>("online");

  const checkHealth = async () => {
    const healthUrl = `${API_ORIGIN_URL}/api/health`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(healthUrl, {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        setIsOnline(true);
        setStatus("online");
      } else if (response.status === 503) {
        setIsOnline(true);
        setStatus("degraded");
      } else {
        setIsOnline(false);
        setStatus("offline");
      }
    } catch {
      setIsOnline(false);
      setStatus("offline");
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return { isOnline, status, checkHealth };
};
