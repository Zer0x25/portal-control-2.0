import { formatInTimeZone, toDate } from "date-fns-tz";
import { getBusinessNow } from "../hooks/useBusinessNow";
import {
  addBusinessDaysCL,
  formatBusinessDateCL,
  isBusinessDateCL,
  parseBusinessDateTimeCL,
  parseBusinessDateCL,
  nowUtcInstant,
  toEndExclusive,
  toEndInclusive,
} from "./timePolicy";
// No imports needed from date-fns for unused functions

const CHILE_TZ = "America/Santiago";

/**
 * Obtiene la fecha y hora actual ajustada a la zona horaria de Chile.
 */
export const getChileNow = (): Date => {
  return toDate(getBusinessNow(), { timeZone: CHILE_TZ });
};

/**
 * Obtiene la fecha actual en formato ISO (YYYY-MM-DD) en la zona horaria de Chile.
 */
export const getChileDateISO = (date: Date = getBusinessNow()): string => {
  return formatInTimeZone(date, CHILE_TZ, "yyyy-MM-dd");
};

export const toBusinessDateChile = (date: Date = getBusinessNow()): string => {
  return formatBusinessDateCL(date);
};

/**
 * Obtiene una representación legible de la hora en Chile.
 */
export const getChileTimeString = (date: Date = getBusinessNow()): string => {
  return formatInTimeZone(date, CHILE_TZ, "HH:mm:ss");
};

/**
 * Crea un objeto Date representando la medianoche de una fecha específica en Chile.
 * @param dateStr Formato YYYY-MM-DD
 */
export const getChileMidnight = (dateStr: string): Date => {
  return toDate(`${dateStr}T00:00:00`, { timeZone: CHILE_TZ });
};

/**
 * Convierte un string de hora (HH:mm) a minutos desde la medianoche.
 */
export const parseTimeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

// --- RESTORED UTILITIES FOR COMPATIBILITY ---

/**
 * Returns the start of the week (Monday) for a given date in UTC.
 */
export const getWeekStartDate = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - (day === 0 ? 6 : day - 1);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff, 0, 0, 0, 0));
};

/**
 * Returns the date range for a given period mode in UTC.
 */
export const getDateRange = (
  mode: "day" | "week" | "month",
  date: Date,
): { startDate: Date; endDate: Date } => {
  const d = new Date(date);
  let startDate: Date;
  let endDate: Date;

  if (mode === "day") {
    startDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
    endDate = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999),
    );
  } else if (mode === "week") {
    startDate = getWeekStartDate(d);
    endDate = new Date(startDate);
    endDate.setUTCDate(startDate.getUTCDate() + 6);
    endDate.setUTCHours(23, 59, 59, 999);
  } else {
    // month
    startDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
    endDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  }

  return { startDate, endDate };
};

/**
 * Wrapper for Intl.DateTimeFormat to maintain compatibility.
 */
export const formatDateToLocalString = (
  date: Date,
  options: Intl.DateTimeFormatOptions,
): string => {
  return new Intl.DateTimeFormat("es-CL", options).format(date);
};

/**
 * Parses a YYYY-MM-DD string into a UTC Date at midnight.
 */
export const parseDateAsUTC = (dateStr: string): Date => {
  if (!dateStr || !isBusinessDateCL(dateStr)) {
    return new Date(Number.NaN);
  }
  return parseBusinessDateCL(dateStr);
};

export const parseDateOnlyUTC = (dateStr: string): Date => {
  return parseDateAsUTC(dateStr);
};

export const formatDateUTCISO = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const compareBusinessDate = (a: string, b: string): -1 | 0 | 1 => {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

export const addBusinessDaysChile = (dateStr: string, days: number): string => {
  return addBusinessDaysCL(dateStr, days);
};

type BusinessRangePreset = "month" | "quarter" | "semester" | "year";

const padTwo = (value: number): string => String(value).padStart(2, "0");

const getMonthLength = (year: number, monthOneBased: number): number => {
  return new Date(Date.UTC(year, monthOneBased, 0, 12, 0, 0)).getUTCDate();
};

export const getBusinessDateRangePreset = (
  mode: BusinessRangePreset,
  anchorDate: Date = getBusinessNow(),
): { startDate: string; endDate: string } => {
  const year = anchorDate.getFullYear();
  const monthOneBased = anchorDate.getMonth() + 1;

  let startMonth = monthOneBased;
  let endMonth = monthOneBased;

  if (mode === "quarter") {
    startMonth = Math.floor((monthOneBased - 1) / 3) * 3 + 1;
    endMonth = startMonth + 2;
  } else if (mode === "semester") {
    startMonth = monthOneBased <= 6 ? 1 : 7;
    endMonth = monthOneBased <= 6 ? 6 : 12;
  } else if (mode === "year") {
    startMonth = 1;
    endMonth = 12;
  }

  const startDate = `${year}-${padTwo(startMonth)}-01`;
  const endDate = `${year}-${padTwo(endMonth)}-${padTwo(getMonthLength(year, endMonth))}`;
  const yesterday = addBusinessDaysCL(toBusinessDateChile(anchorDate), -1);

  return {
    startDate,
    endDate: compareBusinessDate(endDate, yesterday) === 1 ? yesterday : endDate,
  };
};

export const formatBusinessDate = (
  dateStr: string,
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "long", year: "numeric" },
): string => {
  if (!dateStr || !isBusinessDateCL(dateStr)) {
    return "--";
  }

  return parseDateOnlyUTC(dateStr).toLocaleDateString("es-CL", {
    ...options,
    timeZone: CHILE_TZ,
  });
};

export {
  formatBusinessDateCL,
  parseBusinessDateTimeCL,
  parseBusinessDateCL,
  addBusinessDaysCL,
  nowUtcInstant,
  toEndExclusive,
  toEndInclusive,
};

export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return "N/A";
  const d = new Date(date);
  return formatInTimeZone(d, CHILE_TZ, "dd-MM-yyyy, hh:mm:ss a");
};

/**
 * Returns an array of Dates for all days in a given month.
 */
export const getDaysInMonthArray = (year: number, month: number): Date[] => {
  const date = new Date(year, month, 1);
  const days: Date[] = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

/**
 * Returns an array of 7 Dates starting from the given date.
 */
export const getDaysInWeekArray = (startDate: Date): Date[] => {
  const days: Date[] = [];
  const current = new Date(startDate);
  for (let i = 0; i < 7; i++) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
};

/**
 * Generates a calendar grid with padding for the month/week view.
 */
export const generateCalendarGrid = (
  mode: "month" | "week",
  displayDate: Date,
): (Date | null)[] => {
  const d = new Date(displayDate);
  if (mode === "month") {
    const year = d.getFullYear();
    const month = d.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const monthDaysArr = getDaysInMonthArray(year, month);

    let startingDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) - 6 (Sat)
    // Adjust for Monday start: 0 (Sun) -> 6, 1 (Mon) -> 0, etc.
    startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

    const cells: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      cells.push(null);
    }
    monthDaysArr.forEach((day) => cells.push(day));
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    return cells;
  } else {
    // week view
    const weekStart = getWeekStartDate(d);
    return getDaysInWeekArray(weekStart);
  }
};
