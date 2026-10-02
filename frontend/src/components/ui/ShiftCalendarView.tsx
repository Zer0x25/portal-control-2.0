import React, { useMemo } from "react";
import { formatDateUTCISO, generateCalendarGrid } from "../../utils/dateUtils";
import { ScheduleMap } from "../../hooks/useCalendarData";
import ShiftCalendarDayCell from "./ShiftCalendarDayCell";

type CalendarViewMode = "month" | "week";

interface ShiftCalendarViewProps {
  viewMode: CalendarViewMode;
  currentDisplayDate: Date;
  selectedEmployeeId: string | null;
  scheduleMap: ScheduleMap;
  onDayClick: (date: Date) => void;
  cellHeight?: string;
}

const ShiftCalendarView: React.FC<ShiftCalendarViewProps> = ({
  viewMode,
  currentDisplayDate,
  scheduleMap,
  onDayClick,
  cellHeight,
}) => {
  const calendarGridCells: (Date | null)[] = useMemo(() => {
    return generateCalendarGrid(viewMode, currentDisplayDate);
  }, [currentDisplayDate, viewMode]);

  const weekDayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  const defaultHeight = viewMode === "month" ? "h-28 sm:h-32" : "h-36 sm:h-40";
  const cellHeightClass = cellHeight || defaultHeight;

  return (
    <div className="overflow-hidden rounded-md border border-gray-300 dark:border-gray-800 shadow-sm bg-[#fdfbf7] dark:bg-gray-950">
      {/* Headers row */}
      <div className="grid grid-cols-7 border-b border-gray-300 dark:border-gray-800">
        {weekDayNames.map((dayName) => (
          <div key={dayName} className="py-4 text-center">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
              {dayName}
            </span>
          </div>
        ))}
      </div>

      {/* Grid of days */}
      <div className="grid grid-cols-7 gap-px bg-gray-300 dark:bg-gray-800">
        {calendarGridCells.map((day, index) => {
          if (!day) {
            return (
              <div
                key={`empty-${index}`}
                className={`bg-gray-50/30 dark:bg-gray-900/20 ${cellHeightClass}`}
              ></div>
            );
          }
          const dateStr = formatDateUTCISO(day);
          const dayData = scheduleMap.get(dateStr);
          const isToday = new Date().toDateString() === day.toDateString();

          return (
            <ShiftCalendarDayCell
              key={day.toISOString()}
              day={day}
              dayData={dayData}
              isToday={isToday}
              cellHeightClass={cellHeightClass}
              onDayClick={onDayClick}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ShiftCalendarView;
