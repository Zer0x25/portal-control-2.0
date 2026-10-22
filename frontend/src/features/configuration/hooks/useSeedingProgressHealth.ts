import { useEffect, useState } from "react";
import { healthService, type HealthData } from "../../../services/healthService";

/** Actualiza las métricas de salud mientras el flujo de seeding está activo. */
export const useSeedingProgressHealth = (isOpen: boolean, isFinished: boolean) => {
  const [healthData, setHealthData] = useState<HealthData | null>(null);

  useEffect(() => {
    if (!isOpen || isFinished) return;
    let cancelled = false;

    const loadHealth = async () => {
      try {
        const data = await healthService.getHealth();
        if (!cancelled) setHealthData(data);
      } catch {
        // El probe es informativo y no debe interrumpir el seeding.
      }
    };

    void loadHealth();
    const interval = setInterval(() => void loadHealth(), 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isOpen, isFinished]);

  return healthData;
};
