import React from "react";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { TrendingUpIcon, TrendingDownIcon } from "../../../dashboard/components/ui/trend-icons";

interface TrendData {
  date: string;
  actual: number;
  predicted?: number;
  confidence?: number;
}

interface TrendAnalysisProps {
  data: TrendData[];
  title?: string;
  className?: string;
  showAnimation?: boolean;
}

/**
 * Componente avanzado de análisis de tendencias
 * Incluye predicciones y análisis de confianza
 */
export const TrendAnalysis: React.FC<TrendAnalysisProps> = ({
  data,
  title = "Análisis de Tendencias",
  className = "",
  showAnimation = true,
}) => {
  // Calcular tendencias y predicciones
  const analysis = (() => {
    if (data.length < 7) return null;

    const recent = data.slice(-7);
    const previous = data.slice(-14, -7);

    // Calcular promedios
    const recentAvg = recent.reduce((sum, d) => sum + d.actual, 0) / recent.length;
    const previousAvg = previous.reduce((sum, d) => sum + d.actual, 0) / previous.length;

    // Tendencia porcentual
    const trendPercent = ((recentAvg - previousAvg) / previousAvg) * 100;

    // Predicción simple basada en tendencia lineal
    const slope = trendPercent / 100; // pendiente
    const nextWeekPrediction = recentAvg * (1 + slope * 0.5); // predicción conservadora

    // Nivel de confianza basado en variabilidad
    const variance =
      recent.reduce((sum, d) => sum + Math.pow(d.actual - recentAvg, 2), 0) / recent.length;
    const stdDev = Math.sqrt(variance);
    const confidence = Math.max(0, Math.min(100, 100 - (stdDev / recentAvg) * 50));

    // Insights automáticos
    const insights: string[] = [];
    if (trendPercent > 5) {
      insights.push("Tendencia positiva fuerte en asistencia");
    } else if (trendPercent < -5) {
      insights.push("Tendencia negativa en asistencia - requiere atención");
    }

    if (confidence > 80) {
      insights.push("Alta confianza en las predicciones");
    } else if (confidence < 60) {
      insights.push("Baja confianza - revisar datos de entrada");
    }

    // Predicciones para los próximos días
    const predictions: TrendData[] = [];
    for (let i = 1; i <= 7; i++) {
      const futureDate = addDays(new Date(data[data.length - 1].date), i);
      predictions.push({
        date: format(futureDate, "yyyy-MM-dd"),
        actual: 0, // no hay dato real
        predicted: nextWeekPrediction * (0.95 + Math.random() * 0.1), // variación natural
        confidence: confidence * (0.9 - i * 0.05), // confianza decrece con el tiempo
      });
    }

    return {
      trendPercent,
      trendDirection: trendPercent > 0 ? "up" : trendPercent < 0 ? "down" : "stable",
      recentAverage: recentAvg,
      previousAverage: previousAvg,
      nextWeekPrediction,
      confidence,
      insights,
      predictions,
    };
  })();

  if (!analysis) {
    return (
      <div className={`p-4 text-center text-token-text-secondary ${className}`}>
        Datos insuficientes para análisis de tendencias
      </div>
    );
  }

  const TrendIcon =
    analysis.trendDirection === "up"
      ? TrendingUpIcon
      : analysis.trendDirection === "down"
        ? TrendingDownIcon
        : null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header con tendencia principal */}
      <div
        className={`flex items-center justify-between ${showAnimation ? "animate-in fade-in slide-in-from-top-2 [animation-delay:100ms]" : ""}`}
      >
        <h3 className="text-lg font-semibold text-token-text-primary">{title}</h3>
        <div className="flex items-center gap-2">
          {TrendIcon && (
            <TrendIcon
              className={`w-5 h-5 ${
                analysis.trendDirection === "up"
                  ? "text-token-status-success"
                  : analysis.trendDirection === "down"
                    ? "text-token-status-error"
                    : "text-token-text-tertiary"
              }`}
            />
          )}
          <span
            className={`font-bold text-lg ${
              analysis.trendDirection === "up"
                ? "text-token-status-success-text"
                : analysis.trendDirection === "down"
                  ? "text-token-status-error-text"
                  : "text-token-text-secondary"
            }`}
          >
            {analysis.trendPercent > 0 ? "+" : ""}
            {analysis.trendPercent.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Métricas principales */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-3 gap-4 ${showAnimation ? "animate-in fade-in slide-in-from-bottom-4 [animation-delay:200ms]" : ""}`}
      >
        <div className="bg-token-surface-card p-4 rounded-lg border border-token-border-subtle">
          <p className="text-sm text-token-text-secondary mb-1">Semana Actual</p>
          <p className="text-2xl font-bold text-token-text-primary">
            {analysis.recentAverage.toFixed(1)}
          </p>
        </div>

        <div className="bg-token-surface-card p-4 rounded-lg border border-token-border-subtle">
          <p className="text-sm text-token-text-secondary mb-1">Predicción Próxima</p>
          <p className="text-2xl font-bold text-token-status-info-text">
            {analysis.nextWeekPrediction.toFixed(1)}
          </p>
        </div>

        <div className="bg-token-surface-card p-4 rounded-lg border border-token-border-subtle">
          <p className="text-sm text-token-text-secondary mb-1">Confianza</p>
          <p
            className={`text-2xl font-bold ${
              analysis.confidence > 80
                ? "text-token-status-success-text"
                : analysis.confidence > 60
                  ? "text-token-status-warning-text"
                  : "text-token-status-error-text"
            }`}
          >
            {analysis.confidence.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Insights automáticos */}
      {analysis.insights.length > 0 && (
        <div
          className={`bg-token-status-info-surface border border-token-status-info/30 rounded-lg p-4 ${showAnimation ? "animate-in fade-in zoom-in-95 [animation-delay:300ms]" : ""}`}
        >
          <h4 className="font-medium text-token-status-info-text mb-2">💡 Insights Automáticos</h4>
          <ul className="space-y-1">
            {analysis.insights.map((insight, index) => (
              <li
                key={index}
                className="text-sm text-token-status-info-text flex items-start gap-2"
              >
                <span className="text-token-status-info mt-1">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Predicciones futuras */}
      <div
        className={`bg-token-surface-card p-4 rounded-lg border border-token-border-subtle ${showAnimation ? "animate-in fade-in slide-in-from-bottom-4 [animation-delay:400ms]" : ""}`}
      >
        <h4 className="font-medium text-token-text-primary mb-3">Predicciones Próximas</h4>
        <div className="space-y-2">
          {analysis.predictions.slice(0, 3).map((prediction) => (
            <div
              key={prediction.date}
              className="flex items-center justify-between py-2 border-b border-token-border-subtle last:border-b-0"
            >
              <span className="text-sm text-token-text-secondary">
                {format(new Date(prediction.date), "EEEE, dd/MM", { locale: es })}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-token-text-primary">
                  {prediction.predicted?.toFixed(1)}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    (prediction.confidence || 0) > 80
                      ? "bg-token-status-success-surface text-token-status-success-text"
                      : (prediction.confidence || 0) > 60
                        ? "bg-token-status-warning-surface text-token-status-warning-text"
                        : "bg-token-status-error-surface text-token-status-error-text"
                  }`}
                >
                  {(prediction.confidence || 0).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

TrendAnalysis.displayName = "TrendAnalysis";
