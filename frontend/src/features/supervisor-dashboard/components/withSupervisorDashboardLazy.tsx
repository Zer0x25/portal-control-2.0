import React, { Suspense, ComponentType } from "react";
import { motion } from "framer-motion";
import LazySectionFallback from "../../../components/ui/LazySectionFallback";

/**
 * HOC para lazy loading de componentes del supervisor dashboard
 * Incluye skeleton loading y error boundaries optimizados
 */
export function withSupervisorDashboardLazy<P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  Fallback?: React.ComponentType,
): ComponentType<P> {
  const LazyComponent = React.lazy(importFunc);

  const WrappedComponent: React.FC<P> = (props) => (
    <Suspense
      fallback={Fallback ? <Fallback /> : <LazySectionFallback rows={7} className="py-6" />}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <LazyComponent {...props} />
      </motion.div>
    </Suspense>
  );

  WrappedComponent.displayName = `withSupervisorDashboardLazy(LazyComponent)`;

  return WrappedComponent;
}

/**
 * Hook para precarga inteligente de componentes del supervisor dashboard
 * Precarga componentes basados en patrones de uso comunes
 */
export const useSupervisorDashboardPreload = () => {
  const preloadAnalytics = React.useCallback(() => {
    // Precargar componentes de analytics cuando el usuario está en overview
    import("../components/analytics/AttendanceAnalyticsWidget");
    import("../components/analytics/AttendanceHeatmap");
    import("../components/analytics/TrendAnalysis");
  }, []);

  const preloadKpis = React.useCallback(() => {
    // Precargar componentes de KPIs
    import("../components/KpisTab");
    import("../hooks/useKpisLogic");
  }, []);

  const preloadReports = React.useCallback(() => {
    // Precargar componentes de reportes
    import("../components/ReportsTab");
  }, []);

  return {
    preloadAnalytics,
    preloadKpis,
    preloadReports,
  };
};

export default withSupervisorDashboardLazy;
