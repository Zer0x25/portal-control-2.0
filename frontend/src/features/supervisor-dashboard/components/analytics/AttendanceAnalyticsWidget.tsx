import React from "react";
import { motion } from "framer-motion";
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
    slate: "text-slate-500",
  };
  const trendTextColorClass: Record<string, string> = {
    emerald: "text-emerald-600",
    red: "text-red-600",
    slate: "text-slate-600",
  };

  return (
    <WidgetContainer title="Analytics de Asistencia" className={className}>
      {/* Información de tendencia en el contenido */}
      {trends && (
        <motion.div
          className="flex items-center gap-2 mb-4 p-3 bg-token-surface-stripe rounded-lg"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <TrendIcon className={`w-4 h-4 ${trendIconColorClass[trendColor]}`} />
          <span className={`font-medium ${trendTextColorClass[trendColor]}`}>
            {trends.weeklyChange > 0 ? "+" : ""}
            {trends.weeklyChange.toFixed(1)}%
          </span>
          <span className="text-token-text-secondary text-sm">vs semana anterior</span>
        </motion.div>
      )}
      <div className="space-y-6">
        {/* Estadísticas principales */}
        {stats && (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
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
          </motion.div>
        )}

        {/* Gráfico */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative"
        >
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
        </motion.div>

        {/* Información adicional */}
        {stats && (
          <motion.div
            className="text-sm text-token-text-secondary space-y-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <p>• Análisis de los últimos {stats.totalDays} días</p>
            <p>• Día con mejor asistencia: {formatBusinessDate(stats.bestDay.date)}</p>
            <p>• Día con peor asistencia: {formatBusinessDate(stats.worstDay.date)}</p>
          </motion.div>
        )}
      </div>
    </WidgetContainer>
  );
};
