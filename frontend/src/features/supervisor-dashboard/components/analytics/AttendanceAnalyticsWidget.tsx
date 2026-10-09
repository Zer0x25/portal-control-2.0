import React from "react";
import { useAttendanceAnalytics, useAttendanceTrends } from "../../hooks/useAttendanceAnalytics";
import { WidgetContainer } from "../../../dashboard/components/ui/WidgetContainer";
import MetricCard from "../../../../components/ui/MetricCard";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
} from "../../../dashboard/components/ui/trend-icons";
import { formatBusinessDate } from "../../../../utils/dateUtils";

const AttendanceChart = React.lazy(() =>
  import("./AttendanceChart").then((module) => ({
    default: module.AttendanceChart,
  })),
);

interface AttendanceAnalyticsWidgetProps {
  className?: string;
  showAnimation?: boolean;
}

/**
 * Widget completo de analytics de asistencia
 * Incluye gráfico, estadísticas y tendencias
 */
export const AttendanceAnalyticsWidget: React.FC<AttendanceAnalyticsWidgetProps> = ({
  className = "",
  showAnimation = true,
}) => {
  const { data, stats, isLoading, error } = useAttendanceAnalytics(30);
  const { trends } = useAttendanceTrends(30);

  if (error) {
    return (
      <WidgetContainer title="Analytics de Asistencia" className={className}>
        <div className="flex items-center justify-center h-32 text-token-text-secondary">
          Error al cargar datos de asistencia
        </div>
      </WidgetContainer>
    );
  }

  const TrendIcon =
    trends?.trend === "up"
      ? TrendingUpIcon
      : trends?.trend === "down"
        ? TrendingDownIcon
        : MinusIcon;

  const trendColor =
    trends?.trend === "up" ? "emerald" : trends?.trend === "down" ? "red" : "slate";

  const trendIconColorClass: Record<string, string> = {
    emerald: "text-emerald-500",
    red: "text-red-500",
    slate: "text-token-text-tertiary",
  };
  const trendTextColorClass: Record<string, string> = {
    emerald: "text-emerald-600",
    red: "text-red-600",
    slate: "text-token-text-secondary",
  };

  return (
    <WidgetContainer title="Analytics de Asistencia" className={className}>
      {/* Información de tendencia en el contenido */}
      {trends && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-token-surface-stripe rounded-lg animate-in fade-in slide-in-from-right-2 [animation-delay:300ms]">
          <TrendIcon className={`w-4 h-4 ${trendIconColorClass[trendColor]}`} />
          <span className={`font-medium ${trendTextColorClass[trendColor]}`}>
            {trends.weeklyChange > 0 ? "+" : ""}
            {trends.weeklyChange.toFixed(1)}%
          </span>
          <span className="text-token-text-secondary text-sm">vs semana anterior</span>
        </div>
      )}
      <div className="space-y-6">
        {/* Estadísticas principales */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 [animation-delay:100ms]">
            <MetricCard
              title="Asistencia Promedio"
              value={`${stats.averageAttendance.toFixed(1)}%`}
              indicatorColor={
                stats.averageAttendance >= 90
                  ? "emerald"
                  : stats.averageAttendance >= 80
                    ? "orange"
                    : "red"
              }
            />
            <MetricCard
              title="Llegadas Tarde/Día"
              value={stats.averageLate.toFixed(1)}
              indicatorColor={
                stats.averageLate <= 1 ? "emerald" : stats.averageLate <= 3 ? "orange" : "red"
              }
            />
            <MetricCard
              title="Mejor Día"
              value={stats.bestDay.attendance}
              indicatorColor="emerald"
              className="text-sm"
            />
          </div>
        )}

        {/* Gráfico */}
        <div className="relative animate-in fade-in zoom-in-95 [animation-delay:200ms]">
          {isLoading ? (
            <>
              <div className="w-full h-80 bg-token-surface-stripe rounded-lg animate-pulse" />
              <div className="absolute inset-0 rounded-lg backdrop-blur-sm bg-white/20 dark:bg-black/20 transition-opacity duration-300" />
            </>
          ) : (
            <React.Suspense
              fallback={
                <div className="w-full h-80 bg-token-surface-stripe rounded-lg animate-pulse" />
              }
            >
              <AttendanceChart data={data} days={30} showAnimation={showAnimation} />
            </React.Suspense>
          )}
        </div>

        {/* Información adicional */}
        {stats && (
          <div className="text-sm text-token-text-secondary space-y-1 animate-in fade-in [animation-delay:400ms]">
            <p>• Análisis de los últimos {stats.totalDays} días</p>
            <p>• Día con mejor asistencia: {formatBusinessDate(stats.bestDay.date)}</p>
            <p>• Día con peor asistencia: {formatBusinessDate(stats.worstDay.date)}</p>
          </div>
        )}
      </div>
    </WidgetContainer>
  );
};
