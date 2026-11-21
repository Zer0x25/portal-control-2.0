import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useBusinessNow } from "../../../../hooks/useBusinessNow";
import { parseBusinessDateCL } from "../../../../utils/dateUtils";

import { buildAttendanceHeatmap, type HeatmapData } from "./attendanceHeatmapData";

interface AttendanceHeatmapProps {
  data: HeatmapData[];
  weeks?: number;
  className?: string;
  showAnimation?: boolean;
}

/**
 * Componente de heatmap para visualizar asistencia por día
 * Muestra patrones semanales y tendencias
 */
export const AttendanceHeatmap: React.FC<AttendanceHeatmapProps> = ({
  data,
  weeks = 12,
  className = "",
  showAnimation = true,
}) => {
  const businessNow = useBusinessNow({ tickMs: null });

  const heatmapData = buildAttendanceHeatmap(data, weeks, businessNow);

  // Función para obtener color basado en el valor
  const getColorClass = (value: number | null) => {
    if (value === null) return "bg-token-surface-stripe";

    if (value >= 0.95) return "bg-token-status-success";
    if (value >= 0.9) return "bg-token-status-success/80";
    if (value >= 0.85) return "bg-token-status-success/55";
    if (value >= 0.8) return "bg-token-status-warning";
    if (value >= 0.75) return "bg-token-status-warning/70";
    if (value >= 0.7) return "bg-token-status-sin-marcaje";
    if (value >= 0.65) return "bg-token-status-sin-marcaje/70";
    return "bg-token-status-error/85";
  };

  // Días de la semana
  const weekDays = ["L", "M", "X", "J", "V", "S", "D"];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Leyenda */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-token-text-secondary font-medium">Asistencia por día</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-token-text-tertiary">Menos</span>
          <div className="flex gap-1">
            {[0.6, 0.75, 0.85, 0.95].map((level) => (
              <div key={level} className={`w-3 h-3 rounded-sm ${getColorClass(level)}`} />
            ))}
          </div>
          <span className="text-xs text-token-text-tertiary">Más</span>
        </div>
      </div>

      {/* Heatmap */}
      <div className="overflow-x-auto">
        <div className="inline-flex gap-1">
          {/* Días de la semana (vertical) */}
          <div className="flex flex-col gap-1 pr-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="h-3 flex items-center justify-end text-xs text-token-text-tertiary font-medium"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Semanas */}
          {heatmapData.map((week, weekIndex) => (
            <div
              key={weekIndex}
              className="flex flex-col gap-1 animate-in fade-in slide-in-from-right-4 [animation-duration:300ms]"
              style={showAnimation ? { animationDelay: `${weekIndex * 50}ms` } : undefined}
            >
              {week.map((day, dayIndex) => (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={`
                    w-3 h-3 rounded-sm cursor-pointer transition duration-200 hover:scale-120 active:scale-90
                    hover:ring-2 hover:ring-token-border-focus hover:ring-offset-1
                    ${getColorClass(day?.value || null)}
                  `}
                  title={
                    day
                      ? `${format(parseBusinessDateCL(day.date), "dd/MM/yyyy", { locale: es })}: ${(day.value * 100).toFixed(0)}%`
                      : ""
                  }
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Información adicional */}
      <div className="text-xs text-token-text-tertiary space-y-1">
        <p>• Cada cuadrado representa un día</p>
        <p>• El color indica el porcentaje de asistencia</p>
        <p>• Pasa el mouse sobre los cuadrados para ver detalles</p>
      </div>
    </div>
  );
};

AttendanceHeatmap.displayName = "AttendanceHeatmap";
