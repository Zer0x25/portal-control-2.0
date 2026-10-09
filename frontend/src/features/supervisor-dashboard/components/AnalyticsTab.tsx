import React from "react";
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 [animation-duration:300ms]">
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
        <div className="xl:col-span-2 animate-in fade-in slide-in-from-left-4 [animation-delay:100ms]">
          <AttendanceAnalyticsWidget />
        </div>

        {/* Mapa de Calor */}
        <div className="animate-in fade-in slide-in-from-bottom-4 [animation-delay:200ms]">
          <WidgetContainer title="Patrones de Asistencia">
            <AttendanceHeatmap data={heatmapData} weeks={12} showAnimation={true} />
          </WidgetContainer>
        </div>

        {/* Análisis de Tendencias */}
        <div className="animate-in fade-in slide-in-from-bottom-4 [animation-delay:300ms]">
          <WidgetContainer title="Tendencias y Predicciones">
            <TrendAnalysis data={trendData} showAnimation={true} />
          </WidgetContainer>
        </div>
      </div>
    </div>
  );
});

AnalyticsTab.displayName = "AnalyticsTab";

export default AnalyticsTab;
