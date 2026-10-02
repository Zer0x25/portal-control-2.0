import React, { memo } from "react";
import { ReportStat } from "../../types/index";
import { formatDecimalHoursToHHMM } from "../../utils/formatters";
import { motion } from "framer-motion";

interface MobileSummaryCardProps {
  stat: ReportStat;
}

const ReportTableMobileSummaryCard: React.FC<MobileSummaryCardProps> = ({ stat }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="relative overflow-hidden p-4 rounded-2xl shadow-xl shadow-black/5 bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/20 dark:border-white/5"
  >
    <div className="absolute top-0 left-0 w-1.5 h-full bg-sap-blue"></div>

    <p className="font-extrabold text-gray-900 dark:text-white text-base leading-tight">
      {stat.name}
    </p>

    <div className="mt-4 grid grid-cols-2 gap-y-3 gap-x-2">
      <div className="space-y-0.5">
        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          Días Prog / Trab
        </span>
        <span className="text-sm font-black text-gray-800 dark:text-gray-200">
          {stat.scheduledDays} <span className="text-gray-300 mx-1">/</span> {stat.workedDays}
        </span>
      </div>

      <div className="space-y-0.5">
        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          Hrs. Prog / Trab
        </span>
        <span className="text-sm font-black text-gray-800 dark:text-gray-200">
          {formatDecimalHoursToHHMM(stat.totalHoursScheduled)}{" "}
          <span className="text-gray-300 mx-1">/</span>{" "}
          {formatDecimalHoursToHHMM(stat.totalHoursWorked)}
        </span>
      </div>

      <div className="space-y-0.5">
        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          Diferencia
        </span>
        <span
          className={`text-sm font-black ${stat.differenceHours >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}
        >
          {formatDecimalHoursToHHMM(stat.differenceHours)}h
        </span>
      </div>

      <div className="space-y-0.5">
        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          Anomalías
        </span>
        <div className="flex gap-2">
          <span
            className={`text-xs font-black px-2 py-0.5 rounded-md ${stat.tardinessIncidents > 0 ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300" : "bg-gray-100 dark:bg-gray-700 text-gray-400"}`}
          >
            {stat.tardinessIncidents} A
          </span>
          <span
            className={`text-xs font-black px-2 py-0.5 rounded-md ${stat.absenceDays > 0 ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400" : "bg-gray-100 dark:bg-gray-700 text-gray-400"}`}
          >
            {stat.absenceDays} F
          </span>
        </div>
      </div>
    </div>
  </motion.div>
);

export default memo(ReportTableMobileSummaryCard);
