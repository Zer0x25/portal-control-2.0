import { toDate } from "date-fns-tz";
import { getBusinessNow } from "../hooks/useBusinessNow";

export const BUSINESS_TZ = "America/Santiago";
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
let businessDateFormatter: Intl.DateTimeFormat | undefined;

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

export const nowUtcInstant = (date: Date = getBusinessNow()): UtcInstant => date.toISOString();

export const formatBusinessDateCL = (date: Date = getBusinessNow()): BusinessDateCL => {
  businessDateFormatter ??= new Intl.DateTimeFormat("en-CA", {
    calendar: "gregory",
    numberingSystem: "latn",
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  let year = "";
  let month = "";
  let day = "";
  for (const part of businessDateFormatter.formatToParts(date)) {
    if (part.type === "year") year = part.value;
    else if (part.type === "month") month = part.value;
    else if (part.type === "day") day = part.value;
  }

  return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

export const parseBusinessDateCL = (dateStr: BusinessDateCL): Date => {
  assertBusinessDateCL(dateStr);
  return toDate(`${dateStr}T00:00:00`, { timeZone: BUSINESS_TZ });
};

export const addBusinessDaysCL = (dateStr: BusinessDateCL, days: number): BusinessDateCL => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const base = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  base.setUTCDate(base.getUTCDate() + days);
  return formatBusinessDateCL(base);
};

export const parseBusinessDateTimeCL = (dateStr: BusinessDateCL, time: string): Date => {
  assertBusinessDateCL(dateStr);
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
    throw new Error(`Invalid business time: ${time}`);
  }
  return toDate(`${dateStr}T${time}`, { timeZone: BUSINESS_TZ });
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
