import React from "react";
import { motion } from "framer-motion";

/**
 * Componente de loading optimizado para lazy loading
 * Muestra un skeleton mientras se carga el componente
 */
export const DashboardSkeleton: React.FC = React.memo(() => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6"
    >
      {/* Welcome Panel Skeleton */}
      <motion.div
        className="lg:col-span-3 bg-token-surface-card rounded-lg p-6 border border-token-border-subtle"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="animate-pulse">
          <div className="h-6 bg-token-surface-stripe rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-token-surface-stripe rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-token-surface-stripe rounded w-1/3"></div>
        </div>
      </motion.div>

      {/* Quick Actions Skeleton */}
      <motion.div
        className="bg-token-surface-card rounded-lg p-6 border border-token-border-subtle"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="animate-pulse">
          <div className="h-5 bg-token-surface-stripe rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-token-surface-stripe rounded"></div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Team Status Skeleton */}
      <motion.div
        className="bg-token-surface-card rounded-lg p-6 border border-token-border-subtle"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="animate-pulse">
          <div className="h-5 bg-token-surface-stripe rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-token-surface-stripe rounded"></div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Tools Skeleton */}
      <motion.div
        className="bg-token-surface-card rounded-lg p-6 border border-token-border-subtle"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="animate-pulse">
          <div className="h-5 bg-token-surface-stripe rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-token-surface-stripe rounded"></div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

DashboardSkeleton.displayName = "DashboardSkeleton";
