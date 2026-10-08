import React, { useMemo } from "react";
import MetricCard from "../../../../components/ui/MetricCard";

interface MetricItem {
  title: string;
  value: number | string;
  indicatorColor: "emerald" | "slate" | "orange" | "gray" | "red" | "blue";
  className?: string;
  onClick?: () => void;
  clickable?: boolean;
}

interface MetricGridProps {
  metrics: MetricItem[];
  columns?: 1 | 2 | 3 | 4;
  gap?: "sm" | "md" | "lg";
  className?: string;
  showAnimation?: boolean;
}

/**
 * Componente reutilizable para mostrar grillas de métricas
 * Usado en el panel de equipo y otros lugares que necesiten métricas
 * Optimizado con React.memo y useMemo para máxima performance
 */
export const MetricGrid: React.FC<MetricGridProps> = React.memo(
  ({ metrics, columns = 3, gap = "md", className = "", showAnimation = true }) => {
    // Memoizar configuraciones de grid para evitar recálculos
    const gridCols = useMemo(
      () => ({
        1: "grid-cols-1",
        2: "grid-cols-1 sm:grid-cols-2",
        3: "grid-cols-1 sm:grid-cols-3",
        4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
      }),
      [],
    );

    const gapClasses = useMemo(
      () => ({
        sm: "gap-2",
        md: "gap-3",
        lg: "gap-4",
      }),
      [],
    );

    // Memoizar clases del contenedor
    const containerClasses = useMemo(
      () =>
        `
    grid ${gridCols[columns]} ${gapClasses[gap]} ${className}
  `.trim(),
      [gridCols, columns, gapClasses, gap, className],
    );

    // Memoizar las métricas renderizadas para evitar re-renders
    const renderedMetrics = useMemo(
      () =>
        metrics.map((metric, index) => (
          <MetricCard
            key={`${metric.title}-${index}`}
            title={metric.title}
            value={metric.value}
            indicatorColor={metric.indicatorColor}
            className={metric.className}
            onClick={metric.onClick}
          />
        )),
      [metrics],
    );

    return (
      <div
        className={`${containerClasses} ${showAnimation ? "animate-in fade-in duration-200" : ""}`}
      >
        {renderedMetrics}
      </div>
    );
  },
);

MetricGrid.displayName = "MetricGrid";

/**
 * Hook helper para crear métricas del equipo
 */
export const useTeamMetrics = (
  present: number,
  total: number,
  anomaliesCount: number,
  onPresentClick?: () => void,
  onAnomaliesClick?: () => void,
): MetricItem[] => [
  {
    title: "Presentes",
    value: present,
    indicatorColor: "emerald",
    className: present > 0 ? "cursor-pointer" : "",
    onClick: present > 0 ? onPresentClick : undefined,
    clickable: present > 0,
  },
  {
    title: "Plantilla",
    value: total,
    indicatorColor: "slate",
  },
  {
    title: "Anomalías",
    value: anomaliesCount,
    indicatorColor: anomaliesCount > 0 ? "orange" : "gray",
    className: anomaliesCount > 0 ? "cursor-pointer" : "opacity-60",
    onClick: anomaliesCount > 0 ? onAnomaliesClick : undefined,
    clickable: anomaliesCount > 0,
  },
];
