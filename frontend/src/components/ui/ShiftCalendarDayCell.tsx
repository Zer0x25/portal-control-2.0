import React, { memo } from "react";
import {
  EmployeeDailyScheduleInfo,
  ScheduledEmployeeDetail,
  ScheduleInfo,
} from "../../types/index";
import type { ScheduleMapValue } from "../../hooks/useCalendarData";

type ShiftCalendarDayCellProps = {
  day: Date;
  dayData: ScheduleMapValue | undefined;
  isToday: boolean;
  cellHeightClass: string;
  onDayClick: (date: Date) => void;
};

const ShiftCalendarDayCell: React.FC<ShiftCalendarDayCellProps> = ({
  day,
  dayData,
  isToday,
  cellHeightClass,
  onDayClick,
}) => {
  let cellContent;

  if (dayData?.type === "employee") {
    const scheduleInfo: ScheduleInfo = dayData.data;

    if (scheduleInfo?.justificationType) {
      cellContent = (
        <div
          className="flex flex-col items-center justify-center h-full p-1 rounded-md border border-purple-500/20 bg-purple-500/10 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
          title={scheduleInfo.scheduleText}
        >
          <span className="text-[9px] font-black uppercase tracking-tight text-center leading-none">
            {scheduleInfo.scheduleText}
          </span>
        </div>
      );
    } else if (scheduleInfo && scheduleInfo.isWorkDay) {
      cellContent = (
        <div
          className="flex flex-col items-center justify-center h-full p-1.5 rounded-md border border-token-border-subtle bg-token-surface-card shadow-sm group-hover:shadow-md transition-all"
          title={scheduleInfo.scheduleText}
        >
          {scheduleInfo.isHoliday && (
            <div className="absolute top-1 right-1">
              <span className="flex h-2 w-2 rounded-full bg-amber-500" />
            </div>
          )}
          <div className="flex flex-col items-center text-center">
            <span className="text-[10px] font-black leading-none text-token-text-primary truncate w-full mb-0.5">
              {scheduleInfo.shiftPatternName || "Turno"}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-black text-token-text-primary tabular-nums">
                {scheduleInfo.startTime}
              </span>
              <span className="text-[10px] font-black text-token-text-tertiary">—</span>
              <span className="text-[13px] font-black text-token-text-primary tabular-nums">
                {scheduleInfo.endTime}
              </span>
            </div>
            {scheduleInfo.hours !== undefined && (
              <span className="text-[8px] font-black uppercase text-sap-blue/60 mt-0.5 tracking-tighter">
                {scheduleInfo.hours.toFixed(1)}h Totales
              </span>
            )}
          </div>
        </div>
      );
    } else {
      cellContent = (
        <div className="flex flex-col items-center opacity-30 group-hover:opacity-100 transition-opacity">
          <span className="text-[9px] font-black uppercase tracking-widest text-token-text-tertiary">
            Libre
          </span>
        </div>
      );
    }
  } else if (dayData?.type === "holiday") {
    const holiday = dayData.data;
    cellContent = (
      <div
        className="flex flex-col items-center justify-center h-full p-1.5 rounded-md border border-orange-500/30 bg-orange-500/10 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
        title={holiday.name}
      >
        <span className="text-[8px] font-black uppercase tracking-widest mb-1">Feriado</span>
        <span className="text-[9px] font-bold text-center leading-tight truncate w-full">
          {holiday.name}
        </span>
      </div>
    );
  } else if (dayData?.type === "group") {
    const scheduledEmployees: ScheduledEmployeeDetail[] = dayData.data;
    if (scheduledEmployees.length > 0) {
      const maxVisibleEmployees = isToday ? 4 : 5;
      const visibleEmployees = scheduledEmployees.slice(0, maxVisibleEmployees);
      const hiddenCount = scheduledEmployees.length - visibleEmployees.length;

      cellContent = (
        <div className="flex flex-col gap-1 h-full py-1">
          <div className="flex flex-wrap gap-0.5 justify-center">
            {visibleEmployees.map((emp) => {
              const nameParts = emp.employeeName.split(" ");
              const lastName =
                nameParts.length > 1 ? nameParts[nameParts.length - 1] : emp.employeeName;

              return (
                <div
                  key={emp.employeeId}
                  className="px-1.5 py-0.5 rounded-md text-[8px] font-bold text-white shadow-sm transition-transform hover:scale-110"
                  style={{ backgroundColor: emp.patternColor || "#4B5563" }}
                  title={`${emp.employeeName} | ${emp.shiftPatternName || "N/A"} (${emp.startTime || ""}-${emp.endTime || ""})`}
                >
                  {lastName}
                </div>
              );
            })}
          </div>
          {hiddenCount > 0 && (
            <div className="text-center text-[9px] font-black text-sap-blue/60 uppercase tracking-tighter">
              + {hiddenCount} colab.
            </div>
          )}
        </div>
      );
    }
  }

  const scheduleInfoForBorder =
    dayData?.type === "employee" ? (dayData.data as EmployeeDailyScheduleInfo) : null;

  return (
    <div
      onClick={() => onDayClick(day)}
      className={`
                group relative p-2 ${cellHeightClass} overflow-hidden cursor-pointer transition-colors duration-150
                ${isToday ? "bg-token-accent-brand/5 dark:bg-token-accent-brand/20" : "bg-token-surface-card"}
                border-r border-b border-token-border-subtle
                hover:z-10 hover:shadow-sm hover:bg-sap-blue/5
            `}
    >
      {/* Header: Date number & Today tag */}
      <div className="flex justify-between items-start mb-1">
        <span
          className={`text-xs font-black tabular-nums transition-colors ${isToday ? "text-sap-blue dark:text-blue-400" : "text-token-text-secondary group-hover:text-token-text-primary"}`}
        >
          {day.getDate()}
        </span>

        {isToday && (
          <span className="text-[8px] font-black uppercase tracking-widest text-sap-blue dark:text-blue-300 bg-sap-blue/10 dark:bg-blue-400/20 px-1.5 py-0.5 rounded-md border border-sap-blue/20">
            Hoy
          </span>
        )}
      </div>

      {/* Content area */}
      <div className="h-[calc(100%-1.25rem)] flex flex-col justify-center">{cellContent}</div>

      {/* Subtle indicator for current employee pattern color */}
      {scheduleInfoForBorder?.patternColor && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 opacity-60 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: scheduleInfoForBorder.patternColor }}
        />
      )}

      {/* Active/Today status pulse effect */}
      {isToday && <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-sap-blue" />}
    </div>
  );
};

export default memo(ShiftCalendarDayCell);
