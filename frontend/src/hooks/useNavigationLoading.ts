import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { useIsFetching } from "@tanstack/react-query";
import { useStore } from "../store/useStore";

/**
 * Top loading bar sincronizada con la carga real de queries y rutas (Spec 034 / AC6 / P0-2).
 * Refleja el estado real de consultas de red activas en lugar de un timer simulado.
 */
export const useNavigationLoading = () => {
  const location = useLocation();
  const isFetching = useIsFetching();
  const startLoading = useStore((state) => state.startLoading);
  const stopLoading = useStore((state) => state.stopLoading);

  const prevLocationRef = useRef(location.pathname);
  const isNavigatingRef = useRef(false);

  // Al cambiar de ruta, marcar navegación activa
  useEffect(() => {
    if (prevLocationRef.current !== location.pathname) {
      prevLocationRef.current = location.pathname;
      isNavigatingRef.current = true;
      startLoading();

      // Piso mínimo de ~120ms para evitar parpadeo de 1 frame en rutas estáticas
      const minFloorTimer = setTimeout(() => {
        isNavigatingRef.current = false;
        if (isFetching === 0) {
          stopLoading();
        }
      }, 120);

      return () => clearTimeout(minFloorTimer);
    }
  }, [location.pathname, startLoading, stopLoading, isFetching]);

  // Mantener la barra activa mientras existan queries en curso
  useEffect(() => {
    if (isFetching > 0) {
      startLoading();
    } else if (!isNavigatingRef.current) {
      stopLoading();
    }
  }, [isFetching, startLoading, stopLoading]);
};
