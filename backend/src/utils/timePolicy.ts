import { formatInTimeZone, toDate } from "date-fns-tz";

export const BUSINESS_TZ = "America/Santiago";
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export type BusinessDateCL = string;
export type UtcInstant = string;

export interface BusinessDateRange {
  startDate: BusinessDateCL;
  endDateExclusive: BusinessDateCL;
}

export const isBusinessDateCL = (value: string): boolean => ISO_DATE_REGEX.test(value);

export const assertBusinessDateCL = (value: string): BusinessDateCL => {
  if (!isBusinessDateCL(value)) {
    throw new Error(`Invalid BusinessDateCL: ${value}`);
  }
  return value;
};

export const nowUtcInstant = (): UtcInstant => new Date().toISOString();

export const formatBusinessDateCL = (date: Date = new Date()): BusinessDateCL =>
  formatInTimeZone(date, BUSINESS_TZ, "yyyy-MM-dd");

export const parseBusinessDateCL = (dateStr: BusinessDateCL): Date => {
  assertBusinessDateCL(dateStr);
  return toDate(`${dateStr}T00:00:00`, { timeZone: BUSINESS_TZ });
};

export const compareBusinessDateCL = (a: BusinessDateCL, b: BusinessDateCL): -1 | 0 | 1 => {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

export const addBusinessDaysCL = (dateStr: BusinessDateCL, days: number): BusinessDateCL => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const base = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  base.setUTCDate(base.getUTCDate() + days);
  return formatInTimeZone(base, BUSINESS_TZ, "yyyy-MM-dd");
};

/**
 * Whole calendar days from `from` to `to`, independent of timezone or DST.
 * Positive when `to` is after `from`.
 */
export const differenceInCalendarDaysCL = (from: BusinessDateCL, to: BusinessDateCL): number => {
  const toUtcDayNumber = (value: BusinessDateCL): number => {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day) / (1000 * 60 * 60 * 24);
  };
  return toUtcDayNumber(to) - toUtcDayNumber(from);
};

export const toEndExclusive = (endDateInclusive: BusinessDateCL): BusinessDateCL =>
  addBusinessDaysCL(endDateInclusive, 1);

export const toEndInclusive = (endDateExclusive: BusinessDateCL): BusinessDateCL =>
  addBusinessDaysCL(endDateExclusive, -1);

export const fromInclusiveRange = (range: {
  startDate: BusinessDateCL;
  endDate: BusinessDateCL;
}): BusinessDateRange => ({
  startDate: assertBusinessDateCL(range.startDate),
  endDateExclusive: toEndExclusive(assertBusinessDateCL(range.endDate)),
});

export const toInclusiveRange = (
  range: BusinessDateRange,
): {
  startDate: BusinessDateCL;
  endDate: BusinessDateCL;
} => ({
  startDate: assertBusinessDateCL(range.startDate),
  endDate: toEndInclusive(assertBusinessDateCL(range.endDateExclusive)),
});

export const businessDateToUtcDate = (dateStr: BusinessDateCL): Date => {
  assertBusinessDateCL(dateStr);
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
};
