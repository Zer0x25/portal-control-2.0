import { useEffect } from "react";
import { useLocation } from "react-router";
import { useStore } from "../store/useStore";

/**
 * Hook to detect navigation changes and show loading state via global TopLoadingBar
 */
export const useNavigationLoading = () => {
  const location = useLocation();
  const startLoading = useStore((state) => state.startLoading);
  const stopLoading = useStore((state) => state.stopLoading);

  useEffect(() => {
    // Al detectar un cambio de ruta, iniciamos la carga visual
    startLoading();

    // Simulamos un pequeño retraso para que la transición sea perceptible y profesional
    // En una app real, esto terminaría cuando los datos de la nueva página estén listos.
    const timer = setTimeout(() => {
      stopLoading();
    }, 400);

    return () => clearTimeout(timer);
  }, [location, startLoading, stopLoading]);
};
