/**
 * ⚡ Configuración de Performance - Supervisor Dashboard
 *
 * Optimizaciones específicas para el dashboard supervisor con analytics pesados.
 * Configuraciones agresivas de cache y lazy loading para mejor UX.
 */

export const SUPERVISOR_DASHBOARD_CONFIG = {
  // Cache agresivo para analytics (datos que cambian lentamente)
  analyticsCache: {
    staleTime: 10 * 60 * 1000, // 10 minutos - analytics no necesitan refresco frecuente
    gcTime: 30 * 60 * 1000, // 30 minutos - mantener en cache más tiempo
    refetchOnWindowFocus: false, // No refrescar al cambiar de pestaña
    retry: 1, // Solo 1 reintento para queries pesadas
  },

  // Cache moderado para KPIs (datos operativos)
  kpisCache: {
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
    refetchOnWindowFocus: false,
    retry: 2,
  },

  // Cache rápido para datos en tiempo real
  realtimeCache: {
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: true,
    retry: 3,
  },

  // Configuración de lazy loading
  lazyLoading: {
    // Precargar analytics cuando el usuario está en overview
    preloadThreshold: 1000, // ms antes de precargar
    analyticsComponents: ["AttendanceAnalyticsWidget", "AttendanceHeatmap", "TrendAnalysis"],
    kpiComponents: ["KpisTab", "KpiDetailsModal"],
  },

  // Configuración de animaciones
  animations: {
    // Respetar preferencias de accesibilidad
    respectReducedMotion: true,
    // Duraciones optimizadas para contenido pesado
    tabTransition: 200, // ms
    widgetEntrance: 300, // ms
    chartAnimation: 400, // ms
  },

  // Configuración de virtualización para listas grandes
  virtualization: {
    enabled: true,
    itemHeight: 60, // px
    overscan: 5, // items
  },

  // Configuración de debounce para filtros y búsquedas
  debounce: {
    search: 300, // ms
    filters: 500, // ms
    resize: 150, // ms
  },
} as const;

/**
 * Hook para acceder a configuraciones de performance
 */
export const useSupervisorPerformanceConfig = () => {
  return SUPERVISOR_DASHBOARD_CONFIG;
};
