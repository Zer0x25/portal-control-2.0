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
  const cardBg = isJustified ? "bg-token-surface-stripe" : "bg-token-surface-card";
  const borderClass = isJustified ? "border-token-border-subtle" : "border-token-accent-brand";

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-4 rounded-2xl shadow-lg ${cardBg} backdrop-blur-md border-l-4 ${borderClass} relative overflow-hidden transition-all duration-300 hover:shadow-xl`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="font-extrabold text-token-text-primary text-sm">{item.date}</p>
          <p className="text-[10px] uppercase font-bold text-token-text-tertiary tracking-wider">
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
            <span className="px-2 py-0.5 bg-token-accent-brand/10 text-token-accent-brand rounded-md text-[10px] font-bold uppercase">
              Turno: {item.scheduledShift}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <span className="block text-[9px] font-bold text-token-text-tertiary uppercase tracking-widest">
                Marcaje
              </span>
              <span className="text-xs font-black text-token-text-primary font-mono">
                {item.actualClocks || "--:--"}
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[9px] font-bold text-token-text-tertiary uppercase tracking-widest">
                Hrs. Prog
              </span>
              <span className="text-xs font-black text-token-text-primary font-mono">
                {formatDecimalHoursToHHMM(item.scheduledHours)}h
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[9px] font-bold text-token-text-tertiary uppercase tracking-widest">
                Colación
              </span>
              <span className="text-xs font-black text-token-text-primary font-mono">
                {item.colacionMinutes.toFixed(0)} min
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[9px] font-bold text-token-text-tertiary uppercase tracking-widest">
                Trabajadas
              </span>
              <span className="text-xs font-black text-token-text-primary font-mono">
                {formatDecimalHoursToHHMM(item.workedHours)}h
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-token-border-subtle flex justify-between items-center">
            <span className="text-[10px] font-bold text-token-text-tertiary uppercase">
              Diferencia
            </span>
            <span
              className={`text-sm font-black ${item.differenceHours >= 0 ? "text-token-status-success" : "text-token-status-error"}`}
            >
              {formatDecimalHoursToHHMM(item.differenceHours)}h
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-3 py-2 px-3 bg-token-surface-stripe rounded-xl border border-dashed border-token-border-subtle">
          <p className="text-[10px] text-token-text-tertiary italic">
            Día no laboral o con justificación registrada.
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default memo(ReportTableMobileDailyCard);
