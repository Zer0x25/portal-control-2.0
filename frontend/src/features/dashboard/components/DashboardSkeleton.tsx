import React from "react";

/**
 * Componente de loading optimizado para lazy loading
 * Muestra un skeleton mientras se carga el componente
 */
export const DashboardSkeleton: React.FC = React.memo(() => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 animate-in fade-in duration-150">
      {/* Welcome Panel Skeleton */}
      <div className="lg:col-span-3 bg-token-surface-card rounded-lg p-6 border border-token-border-subtle">
        <div className="animate-pulse">
          <div className="h-6 bg-token-surface-stripe rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-token-surface-stripe rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-token-surface-stripe rounded w-1/3"></div>
        </div>
      </div>

      {/* Quick Actions Skeleton */}
      <div className="bg-token-surface-card rounded-lg p-6 border border-token-border-subtle">
        <div className="animate-pulse">
          <div className="h-5 bg-token-surface-stripe rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-token-surface-stripe rounded"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Status Skeleton */}
      <div className="bg-token-surface-card rounded-lg p-6 border border-token-border-subtle">
        <div className="animate-pulse">
          <div className="h-5 bg-token-surface-stripe rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-token-surface-stripe rounded"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Tools Skeleton */}
      <div className="bg-token-surface-card rounded-lg p-6 border border-token-border-subtle">
        <div className="animate-pulse">
          <div className="h-5 bg-token-surface-stripe rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-token-surface-stripe rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

DashboardSkeleton.displayName = "DashboardSkeleton";
