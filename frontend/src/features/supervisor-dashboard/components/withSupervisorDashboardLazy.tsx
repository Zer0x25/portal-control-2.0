import React, { Suspense, ComponentType } from "react";
import LazySectionFallback from "../../../components/ui/LazySectionFallback";
import {
  preloadSupervisorAnalytics,
  preloadSupervisorKpis,
  preloadSupervisorReports,
} from "../preloadSupervisorDashboardModules";

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
      <div className="animate-in fade-in slide-in-from-top-2 [animation-duration:200ms]">
        <LazyComponent {...props} />
      </div>
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
  return {
    preloadAnalytics: preloadSupervisorAnalytics,
    preloadKpis: preloadSupervisorKpis,
    preloadReports: preloadSupervisorReports,
  };
};

export default withSupervisorDashboardLazy;
