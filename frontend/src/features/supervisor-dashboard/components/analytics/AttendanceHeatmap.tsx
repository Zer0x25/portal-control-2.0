import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { format, eachDayOfInterval, subDays, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { useBusinessNow } from "../../../../hooks/useBusinessNow";
import { parseBusinessDateCL } from "../../../../utils/dateUtils";

interface HeatmapData {
  date: string;
  value: number; // 0-1, donde 1 es asistencia perfecta
  count?: number; // número total de empleados
}

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
export const AttendanceHeatmap: React.FC<AttendanceHeatmapProps> = React.memo(
  ({ data, weeks = 12, className = "", showAnimation = true }) => {
    const businessNow = useBusinessNow({ tickMs: null });

    // Generar datos del heatmap
    const heatmapData = useMemo(() => {
      const endDate = businessNow;
      const startDate = subDays(businessNow, weeks * 7 - 1);
      const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

      // Crear mapa de datos existentes
      const dataMap = new Map(data.map((item) => [item.date, item]));

      // Organizar por semanas y días
      const weeksData: (HeatmapData | null)[][] = [];
      let currentWeek: (HeatmapData | null)[] = [];

      dateRange.forEach((date) => {
        const dateKey = format(date, "yyyy-MM-dd");
        const dayOfWeek = getDay(date); // 0 = Domingo, 1 = Lunes, etc.

        // Si es lunes (1) y ya tenemos una semana, empezar nueva semana
        if (dayOfWeek === 1 && currentWeek.length > 0) {
          // Rellenar días faltantes de la semana anterior
          while (currentWeek.length < 7) {
            currentWeek.unshift(null);
          }
          weeksData.push(currentWeek);
          currentWeek = [];
        }

        // Agregar día a la semana actual
        const existingData = dataMap.get(dateKey);
        currentWeek.push(
          existingData || {
            date: dateKey,
            value: Math.random() * 0.3 + 0.7, // Mock data: 70-100%
            count: 25 + Math.floor(Math.random() * 10),
          },
        );
      });

      // Agregar última semana si tiene datos
      if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
          currentWeek.push(null);
        }
        weeksData.push(currentWeek);
      }

      return weeksData;
    }, [businessNow, data, weeks]);

    // Función para obtener color basado en el valor
    const getColorClass = (value: number | null) => {
      if (value === null) return "bg-token-surface-stripe";

      if (value >= 0.95) return "bg-emerald-500";
      if (value >= 0.9) return "bg-emerald-400";
      if (value >= 0.85) return "bg-emerald-300";
      if (value >= 0.8) return "bg-yellow-400";
      if (value >= 0.75) return "bg-yellow-300";
      if (value >= 0.7) return "bg-orange-400";
      if (value >= 0.65) return "bg-orange-300";
      return "bg-red-400";
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
              <motion.div
                key={weekIndex}
                className="flex flex-col gap-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: showAnimation ? weekIndex * 0.05 : 0,
                  duration: 0.3,
                }}
              >
                {week.map((day, dayIndex) => (
                  <motion.div
                    key={`${weekIndex}-${dayIndex}`}
                    className={`
                    w-3 h-3 rounded-sm cursor-pointer transition-all duration-200
                    hover:ring-2 hover:ring-token-border-focus hover:ring-offset-1
                    ${getColorClass(day?.value || null)}
                  `}
                    title={
                      day
                        ? `${format(parseBusinessDateCL(day.date), "dd/MM/yyyy", { locale: es })}: ${(day.value * 100).toFixed(0)}%`
                        : ""
                    }
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                  />
                ))}
              </motion.div>
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
  },
);

AttendanceHeatmap.displayName = "AttendanceHeatmap";
