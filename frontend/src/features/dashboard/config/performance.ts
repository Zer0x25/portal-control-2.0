import React from "react";

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
