import React, { Suspense, ComponentType } from "react";
import { DashboardSkeleton } from "./DashboardSkeleton";
import LazySectionFallback from "../../../components/ui/LazySectionFallback";

/**
 * HOC para lazy loading de componentes del dashboard
 * Proporciona Suspense con skeleton loading
 */
export function withDashboardLazy<TProps extends object, TRef = unknown>(
  importFunc: () => Promise<{ default: ComponentType<TProps & React.RefAttributes<TRef>> }>,
  FallbackComponent?: React.ComponentType,
) {
  const LazyComponent = React.lazy(importFunc);

  const WrappedComponent = React.forwardRef<TRef, TProps>((props, ref) => (
    <Suspense
      fallback={FallbackComponent ? <FallbackComponent /> : <LazySectionFallback rows={5} />}
    >
      <LazyComponent {...props} ref={ref} />
    </Suspense>
  ));

  WrappedComponent.displayName = "withDashboardLazy";

  return WrappedComponent;
}

/**
 * Hook personalizado para preload de componentes lazy
 * Útil para precargar componentes basados en interacciones del usuario
 */
export function useDashboardPreload() {
  const preloadWelcomePanel = () => {
    import("../components/WelcomePanel");
  };

  const preloadQuickActions = () => {
    import("../components/QuickActionsPanel");
  };

  const preloadTeamStatus = () => {
    import("../components/TeamStatusPanel");
  };

  const preloadTools = () => {
    import("../components/ToolsPanel");
  };

  return {
    preloadWelcomePanel,
    preloadQuickActions,
    preloadTeamStatus,
    preloadTools,
  };
}

// Re-export DashboardSkeleton for direct use
export { DashboardSkeleton };
