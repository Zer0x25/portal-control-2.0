import React from "react";
import { DailyReportItem } from "../../types/index";
import { formatDecimalHoursToHHMM } from "../../utils/formatters";

interface MobileDailyCardProps {
  item: DailyReportItem;
  justificationStyles: Record<string, string>;
}

// Spec 037 T13: daily records expose clocking, schedule, justification, and weekly subtotals in a stacked layout distinct from summary rows.
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
    <div
      data-list-group="responsive-record-cards"
      className={`p-4 rounded-2xl shadow-lg ${cardBg} backdrop-blur-md border-l-4 ${borderClass} relative overflow-hidden transition-shadow duration-300 hover:shadow-xl animate-in fade-in [--tw-enter-translate-x:-10px] [animation-duration:200ms]`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p data-list-role="value" className="typo-list-value text-token-text-primary">
            {item.date}
          </p>
          <p className="typo-list-secondary uppercase text-token-text-tertiary tracking-wide">
            {item.dayOfWeek}
          </p>
        </div>
        {item.justificationType && (
          <span
            className={`typo-list-status px-2.5 py-1 rounded-lg uppercase tracking-wide shadow-sm ${justificationClass}`}
          >
            {item.justificationType}
          </span>
        )}
      </div>

      {!isJustified ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="typo-list-secondary px-2 py-0.5 bg-token-accent-brand/10 text-token-accent-brand rounded-md uppercase">
              Turno: {item.scheduledShift}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <span className="block typo-list-secondary text-token-text-tertiary uppercase tracking-wide">
                Marcaje
              </span>
              <span data-list-role="value" className="typo-list-value text-token-text-primary">
                {item.actualClocks || "--:--"}
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="block typo-list-secondary text-token-text-tertiary uppercase tracking-wide">
                Hrs. Prog
              </span>
              <span data-list-role="value" className="typo-list-value text-token-text-primary">
                {formatDecimalHoursToHHMM(item.scheduledHours)}h
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="block typo-list-secondary text-token-text-tertiary uppercase tracking-wide">
                Colación
              </span>
              <span data-list-role="value" className="typo-list-value text-token-text-primary">
                {item.colacionMinutes.toFixed(0)} min
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="block typo-list-secondary text-token-text-tertiary uppercase tracking-wide">
                Trabajadas
              </span>
              <span data-list-role="value" className="typo-list-value text-token-text-primary">
                {formatDecimalHoursToHHMM(item.workedHours)}h
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-token-border-subtle flex justify-between items-center">
            <span className="typo-list-secondary text-token-text-tertiary uppercase">
              Diferencia
            </span>
            <span
              className={`typo-list-value ${item.differenceHours >= 0 ? "text-token-status-success" : "text-token-status-error"}`}
            >
              {formatDecimalHoursToHHMM(item.differenceHours)}h
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-3 py-2 px-3 bg-token-surface-stripe rounded-xl border border-dashed border-token-border-subtle">
          <p className="typo-list-note text-token-text-tertiary">
            Día no laboral o con justificación registrada.
          </p>
        </div>
      )}
    </div>
  );
};

export default ReportTableMobileDailyCard;
