import { useState, useMemo } from "react";
import { getDateRange, formatDateToLocalString } from "../utils/dateUtils"; // Import the new utility
import { useBusinessNow } from "./useBusinessNow";

export type PeriodViewMode = "day" | "week" | "month";

// Helper to get today's date normalized to UTC midnight
const getUtcToday = (today: Date): Date => {
  return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
};

export const usePeriodNavigator = (initialMode: PeriodViewMode = "week") => {
  const businessNow = useBusinessNow({ tickMs: null });
  const [viewMode, setViewMode] = useState<PeriodViewMode>(initialMode);
  // All date state is now handled as UTC dates
  const [currentDate, setCurrentDate] = useState(() => getUtcToday(businessNow));

  const handlePrev = () => {
    setCurrentDate((prevDate) => {
      const newDate = new Date(prevDate.getTime());
      if (viewMode === "day") {
        newDate.setUTCDate(newDate.getUTCDate() - 1);
      } else if (viewMode === "week") {
        newDate.setUTCDate(newDate.getUTCDate() - 7);
      } else {
        // month
        // Set to the 1st of the month to avoid day overflow issues (e.g., Mar 31 -> Feb 3)
        newDate.setUTCDate(1);
        newDate.setUTCMonth(newDate.getUTCMonth() - 1);
      }
      return newDate;
    });
  };

  const handleNext = () => {
    setCurrentDate((prevDate) => {
      const newDate = new Date(prevDate.getTime());
      if (viewMode === "day") {
        newDate.setUTCDate(newDate.getUTCDate() + 1);
      } else if (viewMode === "week") {
        newDate.setUTCDate(newDate.getUTCDate() + 7);
      } else {
        // month
        newDate.setUTCDate(1);
        newDate.setUTCMonth(newDate.getUTCMonth() + 1);
      }
      return newDate;
    });
  };

  const handleToday = () => {
    setCurrentDate(getUtcToday(businessNow));
  };

  const isViewingCurrentPeriod = useMemo(() => {
    const today = getUtcToday(businessNow);
    // getDateRange already operates in UTC, so this comparison is now safe
    const { startDate, endDate } = getDateRange(viewMode, currentDate);
    return today.getTime() >= startDate.getTime() && today.getTime() <= endDate.getTime();
  }, [businessNow, viewMode, currentDate]);

  const headerDisplay = useMemo(() => {
    const { startDate, endDate } = getDateRange(viewMode, currentDate);

    switch (viewMode) {
      case "day":
        return formatDateToLocalString(startDate, {
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "UTC",
        });
      case "week": {
        const startStr = formatDateToLocalString(startDate, {
          day: "numeric",
          month: "long",
          timeZone: "UTC",
        });
        const endStr = formatDateToLocalString(endDate, {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        });
        return `${startStr} - ${endStr}`;
      }
      case "month": {
        const monthStr = formatDateToLocalString(startDate, {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        });
        return monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
      }
    }
  }, [viewMode, currentDate]);

  return {
    viewMode,
    setViewMode,
    currentDate,
    setCurrentDate,
    handlePrev,
    handleNext,
    handleToday,
    isViewingCurrentPeriod,
    headerDisplay,
  };
};
