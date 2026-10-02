import React from "react";
import { motion } from "framer-motion";
import { AttendanceAnalyticsWidget } from "./analytics/AttendanceAnalyticsWidget";
import { AttendanceHeatmap } from "./analytics/AttendanceHeatmap";
import { TrendAnalysis } from "./analytics/TrendAnalysis";
import { WidgetContainer } from "../../dashboard/components/ui/WidgetContainer";
import { useAnalyticsTabController } from "../hooks/useAnalyticsTabController";

/**
 * 📊 AnalyticsTab: Centro de Analytics Avanzados para Supervisores
 * Proporciona insights profundos sobre asistencia, tendencias y predicciones
 * Optimizado con memoización para mejor performance
 */
const AnalyticsTab: React.FC = React.memo(() => {
  const { heatmapData, trendData } = useAnalyticsTabController();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-token-text-primary mb-2">Centro de Analytics</h2>
        <p className="text-token-text-secondary">
          Insights avanzados sobre asistencia, tendencias y predicciones para toma de decisiones
          estratégicas.
        </p>
      </div>

      {/* Analytics Widgets */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Widget Principal de Analytics */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="xl:col-span-2"
        >
          <AttendanceAnalyticsWidget />
        </motion.div>

        {/* Mapa de Calor */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <WidgetContainer title="Patrones de Asistencia">
            <AttendanceHeatmap data={heatmapData} weeks={12} showAnimation={true} />
          </WidgetContainer>
        </motion.div>

        {/* Análisis de Tendencias */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <WidgetContainer title="Tendencias y Predicciones">
            <TrendAnalysis data={trendData} showAnimation={true} />
          </WidgetContainer>
        </motion.div>
      </div>
    </motion.div>
  );
});

AnalyticsTab.displayName = "AnalyticsTab";

export default AnalyticsTab;
