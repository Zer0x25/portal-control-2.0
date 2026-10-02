import { useMemo } from "react";
import { Employee, ScheduledEmployeeDetail } from "../types/index";
import { formatDateUTCISO, getWeekStartDate } from "../utils/dateUtils";
import { ScheduleInfo } from "../types/scheduling";
import { useCalendarMatrixQuery } from "./queries/useCalendarMatrixQuery";
import { useShiftPatternsQuery } from "./queries/useShiftPatternsQuery";
import { useAssignedShiftsQuery } from "./queries/useAssignedShiftsQuery";

// A map where the key is a YYYY-MM-DD string
export type HolidayCalendarData = {
  name?: string;
  date: string;
  type?: "Nacional" | "Regional" | "Específico";
};
export type ScheduleMapValue =
  | { type: "employee"; data: ScheduleInfo }
  | { type: "group"; data: ScheduledEmployeeDetail[] }
  | { type: "holiday"; data: HolidayCalendarData };
export type ScheduleMap = Map<string, ScheduleMapValue>;

interface UseCalendarDataOptions {
  viewMode: "month" | "week" | "day";
  displayDate: Date;
  filteredEmployees: Employee[];
  selectedEmployeeId: string | null;
}

/**
 * A custom hook to efficiently pre-calculate and memoize all calendar data for a given view.
 * It consumes a pre-calculated matrix from the server via TanStack Query.
 */
export const useCalendarData = (options: UseCalendarDataOptions) => {
  const { viewMode, displayDate, filteredEmployees = [], selectedEmployeeId } = options;

  // 1. Calculate range
  const { startDateStr, endDateStr } = useMemo(() => {
    if (!displayDate || isNaN(displayDate.getTime())) {
      return { startDateStr: "", endDateStr: "" };
    }

    let start: Date;
    let end: Date;

    if (viewMode === "day") {
      start = new Date(
        Date.UTC(displayDate.getFullYear(), displayDate.getMonth(), displayDate.getDate()),
      );
      end = new Date(
        Date.UTC(displayDate.getFullYear(), displayDate.getMonth(), displayDate.getDate()),
      );
    } else if (viewMode === "month") {
      const year = displayDate.getFullYear();
      const month = displayDate.getMonth();
      start = new Date(Date.UTC(year, month, 1));
      end = new Date(Date.UTC(year, month + 1, 0));
    } else {
      // week
      start = getWeekStartDate(new Date(displayDate));
      end = new Date(start);
      end.setDate(start.getUTCDate() + 6);
    }

    try {
      return {
        startDateStr: formatDateUTCISO(start),
        endDateStr: formatDateUTCISO(end),
      };
    } catch (e) {
      console.error("Error calculating date range:", e, { displayDate, viewMode });
      return { startDateStr: "", endDateStr: "" };
    }
  }, [viewMode, displayDate]);

  // 2. Fetch Matrix from server (TanStack Query)
  const employeeIdsKey = useMemo(
    () =>
      selectedEmployeeId ||
      filteredEmployees
        .map((e) => e.id)
        .sort()
        .join(","),
    [selectedEmployeeId, filteredEmployees],
  );

  const employeeIds = useMemo(
    () => (selectedEmployeeId ? [selectedEmployeeId] : filteredEmployees.map((e) => e.id)),
    [selectedEmployeeId, employeeIdsKey],
  );

  const {
    data: matrix,
    isLoading: isLoadingCalendar,
    refetch: refreshCalendar,
  } = useCalendarMatrixQuery(startDateStr, endDateStr, employeeIds);

  // Additional queries requested by ShiftCalendarPage
  const { isLoading: isShiftPatternsLoading } = useShiftPatternsQuery();
  const { isLoading: isAssignedShiftsLoading } = useAssignedShiftsQuery();

  const scheduleMap: ScheduleMap = useMemo(() => {
    if (!matrix) return new Map();

    const newScheduleMap: ScheduleMap = new Map();
    const empIdsInMatrix = Object.keys(matrix);
    if (empIdsInMatrix.length === 0) {
      return new Map();
    }

    const firstEmpId = empIdsInMatrix[0];
    const dates = Object.keys(matrix[firstEmpId] || {});

    for (const dateStr of dates) {
      if (selectedEmployeeId) {
        const info = matrix[selectedEmployeeId]?.[dateStr];
        if (info) {
          if (info.isHoliday && !info.isWorkDay) {
            newScheduleMap.set(dateStr, {
              type: "holiday",
              data: { name: info.holidayName, date: dateStr, type: "Nacional" },
            });
          } else {
            newScheduleMap.set(dateStr, { type: "employee", data: info });
          }
        }
      } else {
        // Group view: Collect scheduled employees
        const scheduledDetails: ScheduledEmployeeDetail[] = [];
        for (const emp of filteredEmployees) {
          const info = matrix[emp.id]?.[dateStr];
          if (info?.isWorkDay) {
            scheduledDetails.push({
              employeeId: emp.id,
              employeeName: emp.name,
              shiftPatternName: info.shiftPatternName || "N/A",
              startTime: info.startTime,
              endTime: info.endTime,
              patternColor: info.patternColor,
            });
          }
        }

        if (scheduledDetails.length === 0) {
          const info = matrix[firstEmpId]?.[dateStr];
          if (info?.isHoliday) {
            newScheduleMap.set(dateStr, {
              type: "holiday",
              data: { name: info.holidayName, date: dateStr },
            });
          }
        } else {
          newScheduleMap.set(dateStr, {
            type: "group",
            data: scheduledDetails,
          });
        }
      }
    }

    return newScheduleMap;
  }, [matrix, selectedEmployeeId, employeeIdsKey]);

  return {
    scheduleMap,
    isLoadingCalendar,
    refreshCalendar,
    isShiftPatternsLoading,
    isAssignedShiftsLoading,
  };
};
