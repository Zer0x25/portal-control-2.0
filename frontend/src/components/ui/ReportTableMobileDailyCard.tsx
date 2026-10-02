import React, { memo } from "react";
import { DailyReportItem } from "../../types/index";
import { formatDecimalHoursToHHMM } from "../../utils/formatters";
import { motion } from "framer-motion";

interface MobileDailyCardProps {
  item: DailyReportItem;
  justificationStyles: Record<string, string>;
}

const ReportTableMobileDailyCard: React.FC<MobileDailyCardProps> = ({
  item,
  justificationStyles,
}) => {
  const justificationClass = item.justificationType
    ? justificationStyles[item.justificationType] || ""
    : "";
  const isJustified = !!item.justificationType;
  const cardBg = isJustified
    ? "bg-white/40 dark:bg-gray-800/30"
    : "bg-white/70 dark:bg-gray-800/60";
  const borderClass = isJustified ? "border-gray-200 dark:border-gray-700" : "border-sap-blue";

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-4 rounded-2xl shadow-lg ${cardBg} backdrop-blur-md border-l-4 ${borderClass} relative overflow-hidden transition-all duration-300 hover:shadow-xl`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="font-extrabold text-gray-900 dark:text-white text-sm">{item.date}</p>
          <p className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
            {item.dayOfWeek}
          </p>
        </div>
        {item.justificationType && (
          <span
            className={`px-2.5 py-1 text-[10px] rounded-lg font-black uppercase tracking-tighter shadow-sm ${justificationClass}`}
          >
            {item.justificationType}
          </span>
        )}
      </div>

      {!isJustified ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-sap-blue/10 text-sap-blue dark:text-sap-light-blue rounded-md text-[10px] font-bold uppercase">
              Turno: {item.scheduledShift}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                Marcaje
              </span>
              <span className="text-xs font-black text-gray-800 dark:text-gray-200">
                {item.actualClocks || "--:--"}
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                Hrs. Prog
              </span>
              <span className="text-xs font-black text-gray-800 dark:text-gray-200">
                {formatDecimalHoursToHHMM(item.scheduledHours)}h
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                Colación
              </span>
              <span className="text-xs font-black text-gray-800 dark:text-gray-200">
                {item.colacionMinutes.toFixed(0)} min
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                Trabajadas
              </span>
              <span className="text-xs font-black text-gray-800 dark:text-gray-200">
                {formatDecimalHoursToHHMM(item.workedHours)}h
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-gray-700/50 flex justify-between items-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Diferencia</span>
            <span
              className={`text-sm font-black ${item.differenceHours >= 0 ? "text-green-600" : "text-red-500"}`}
            >
              {formatDecimalHoursToHHMM(item.differenceHours)}h
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-3 py-2 px-3 bg-gray-50/50 dark:bg-gray-900/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 italic">
            Día no laboral o con justificación registrada.
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default memo(ReportTableMobileDailyCard);
