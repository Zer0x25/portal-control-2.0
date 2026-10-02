import React from "react";
import { QueryClient } from "@tanstack/react-query";

// Configuración optimizada de React Query para el dashboard
export const dashboardQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache más agresivo para datos del dashboard
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos (antes cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: "always",
      retry: (failureCount, error) => {
        // Reintentar menos veces para mejor UX
        if (failureCount >= 2) return false;
        // No reintentar errores de autenticación
        if (error?.message?.includes("401") || error?.message?.includes("403")) return false;
        return true;
      },
      // Optimización de re-fetching
      refetchInterval: false, // Deshabilitar polling automático
      refetchIntervalInBackground: false,
    },
    mutations: {
      retry: 1, // Solo 1 reintento para mutations
      onError: (error) => {
        // Log silencioso para debugging
        console.warn("Dashboard mutation error:", error);
      },
    },
  },
});

// Configuración de Zustand para el dashboard
export const dashboardStoreConfig = {
  // Middleware para logging en desarrollo
  devtools: process.env.NODE_ENV === "development",
  // Middleware para persistencia optimizada
  persist: {
    name: "dashboard-store",
    // Solo persistir datos críticos
    partialize: (state: { currentUser?: unknown; theme?: unknown }) => ({
      currentUser: state.currentUser,
      theme: state.theme,
      // No persistir datos volátiles como weather, etc.
    }),
  },
};

// Configuración de Framer Motion para mejor performance
export const motionConfig = {
  // Reducir motion en dispositivos con preferencia de movimiento reducido
  reducedMotion: "user",
  // Configuración de drag optimizada
  drag: {
    threshold: 10, // Umbral más alto para mejor performance
  },
};

// Hook para detectar si el usuario prefiere movimiento reducido
export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

// Configuración de Intersection Observer para lazy loading
export const intersectionObserverConfig = {
  threshold: 0.1,
  rootMargin: "50px",
};

// Hook personalizado para lazy loading basado en visibilidad
export function useLazyLoad(ref: React.RefObject<Element>, config = intersectionObserverConfig) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect(); // Dejar de observar una vez visible
      }
    }, config);

    observer.observe(element);

    return () => observer.disconnect();
  }, [ref, config]);

  return isVisible;
}
