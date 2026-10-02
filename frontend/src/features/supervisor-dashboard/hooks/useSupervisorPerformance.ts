import { useState, useEffect } from "react";

/**
 * Hook para detectar si el usuario prefiere movimiento reducido
 * Respeta la configuración de accesibilidad del sistema operativo
 */
export const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Verificar si estamos en el navegador
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
};

/**
 * Hook para lazy loading basado en Intersection Observer
 * Optimizado para componentes del supervisor dashboard
 */
export const useSupervisorLazyLoad = (threshold = 0.1) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [ref, setRef] = useState<Element | null>(null);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect(); // Dejar de observar una vez que intersecta
        }
      },
      {
        threshold,
        rootMargin: "50px", // Precargar 50px antes de que entre en viewport
      },
    );

    observer.observe(ref);

    return () => observer.disconnect();
  }, [ref, threshold]);

  return [setRef, isIntersecting] as const;
};
