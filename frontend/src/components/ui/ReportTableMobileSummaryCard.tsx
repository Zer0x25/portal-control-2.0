import React, { memo } from "react";
import { ReportStat } from "../../types/index";
import { formatDecimalHoursToHHMM } from "../../utils/formatters";

interface MobileSummaryCardProps {
  stat: ReportStat;
}

const ReportTableMobileSummaryCard: React.FC<MobileSummaryCardProps> = ({ stat }) => (
  <div className="relative overflow-hidden p-4 rounded-2xl shadow-xl shadow-black/5 bg-token-surface-card backdrop-blur-xl border border-token-border-subtle animate-in fade-in [--tw-enter-translate-y:10px] [animation-duration:200ms]">
    <div className="absolute top-0 left-0 w-1.5 h-full bg-token-accent-brand"></div>

    <p className="font-extrabold text-token-text-primary text-base leading-tight">{stat.name}</p>

    <div className="mt-4 grid grid-cols-2 gap-y-3 gap-x-2">
      <div className="space-y-0.5">
        <span className="block text-[10px] font-bold text-token-text-tertiary uppercase tracking-wider">
          Días Prog / Trab
        </span>
        <span className="text-sm font-black text-token-text-primary">
          {stat.scheduledDays} <span className="text-token-text-tertiary opacity-40 mx-1">/</span>{" "}
          {stat.workedDays}
        </span>
      </div>

      <div className="space-y-0.5">
        <span className="block text-[10px] font-bold text-token-text-tertiary uppercase tracking-wider">
          Hrs. Prog / Trab
        </span>
        <span className="text-sm font-black text-token-text-primary font-mono">
          {formatDecimalHoursToHHMM(stat.totalHoursScheduled)}{" "}
          <span className="text-token-text-tertiary opacity-40 mx-1">/</span>{" "}
          {formatDecimalHoursToHHMM(stat.totalHoursWorked)}
        </span>
      </div>

      <div className="space-y-0.5">
        <span className="block text-[10px] font-bold text-token-text-tertiary uppercase tracking-wider">
          Diferencia
        </span>
        <span
          className={`text-sm font-black ${stat.differenceHours >= 0 ? "text-token-status-success" : "text-token-status-error"}`}
        >
          {formatDecimalHoursToHHMM(stat.differenceHours)}h
        </span>
      </div>

      <div className="space-y-0.5">
        <span className="block text-[10px] font-bold text-token-text-tertiary uppercase tracking-wider">
          Anomalías
        </span>
        <div className="flex gap-2">
          <span
            className={`text-xs font-black px-2 py-0.5 rounded-md ${stat.tardinessIncidents > 0 ? "bg-amber-500/15 text-token-status-warning" : "bg-token-surface-active text-token-text-tertiary"}`}
          >
            {stat.tardinessIncidents} A
          </span>
          <span
            className={`text-xs font-black px-2 py-0.5 rounded-md ${stat.absenceDays > 0 ? "bg-red-500/15 text-token-status-error" : "bg-token-surface-active text-token-text-tertiary"}`}
          >
            {stat.absenceDays} F
          </span>
        </div>
      </div>
    </div>
  </div>
);

export default memo(ReportTableMobileSummaryCard);
