import { formatInTimeZone, toDate } from "date-fns-tz";
import {
  addBusinessDaysCL,
  compareBusinessDateCL,
  formatBusinessDateCL,
  nowUtcInstant,
  parseBusinessDateCL,
} from "./timePolicy";

const CHILE_TZ = "America/Santiago";

/**
 * Obtiene la fecha y hora actual como un objeto Date, pero representando la hora de Chile.
 * Útil para comparaciones locales que no dependan del reloj del servidor.
 */
export const getChileNow = (): Date => {
  return toDate(new Date(), { timeZone: CHILE_TZ });
};

/**
 * Obtiene la fecha actual en formato ISO (YYYY-MM-DD) en la zona horaria de Chile.
 */
export const getChileDateISO = (date: Date = new Date()): string => {
  return formatInTimeZone(date, CHILE_TZ, "yyyy-MM-dd");
};

/**
 * Single source of truth for date-only business values in Chile timezone.
 */
export const toBusinessDateChile = (date: Date = new Date()): string => {
  return formatBusinessDateCL(date);
};

/**
 * Convierte una fecha a minutos transcurridos desde la medianoche en la zona horaria de Chile.
 */
export const getMinutesFromMidnightChile = (date: Date | string): number => {
  const d = typeof date === "string" ? new Date(date) : date;
  const timeStr = formatInTimeZone(d, CHILE_TZ, "HH:mm");
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

/**
 * Obtiene una representación legible de la hora en Chile.
 */
export const getChileTimeString = (date: Date = new Date()): string => {
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
 * Parses a YYYY-MM-DD business date into a Date pinned to Chile local midnight.
 */
export const parseBusinessDateChile = (dateStr: string): Date => {
  return parseBusinessDateCL(dateStr);
};

/**
 * Adds calendar days to a business date while preserving YYYY-MM-DD semantics.
 */
export const addBusinessDaysChile = (dateStr: string, days: number): string => {
  return addBusinessDaysCL(dateStr, days);
};

/**
 * Returns the last day of month as business date in Chile timezone.
 */
export const getMonthEndBusinessDateChile = (year: number, month1to12: number): string => {
  const date = new Date(Date.UTC(year, month1to12, 0, 12, 0, 0));
  return formatInTimeZone(date, CHILE_TZ, "yyyy-MM-dd");
};

/**
 * Formats a Date to YYYY-MM-DD using UTC calendar fields.
 */
export const formatDateUTCISO = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Parses a YYYY-MM-DD string as UTC midnight.
 */
export const parseDateOnlyUTC = (dateStr: string): Date => {
  return new Date(`${dateStr}T00:00:00Z`);
};

export const compareBusinessDate = (a: string, b: string): -1 | 0 | 1 => {
  return compareBusinessDateCL(a, b);
};

export {
  formatBusinessDateCL,
  parseBusinessDateCL,
  addBusinessDaysCL,
  compareBusinessDateCL,
  nowUtcInstant,
};

/**
 * Convierte un string de hora (HH:mm) a minutos desde la medianoche.
 */
export const parseTimeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};
