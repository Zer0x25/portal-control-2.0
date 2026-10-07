import type { DailyMetric } from "./types";

// Version 1 guarantees full-month scheduling context. Legacy arrays do not.
const CACHE_VERSION = 1;
export const serializeMonthlyBreakdown = (days: DailyMetric[]): string =>
  JSON.stringify({ version: CACHE_VERSION, days });

const numericFields = [
  "scheduledHours",
  "workedHours",
  "overtime",
  "colacionMinutes",
  "differenceHours",
] as const;
const stringFields = [
  "date",
  "isoDate",
  "dayOfWeek",
  "scheduledShift",
  "actualClocks",
  "status",
] as const;
function isDailyMetric(value: unknown): value is DailyMetric {
  if (!value || typeof value !== "object") return false;
  const day = value as Record<string, unknown>;
  return (
    numericFields.every((key) => typeof day[key] === "number" && Number.isFinite(day[key])) &&
    stringFields.every((key) => typeof day[key] === "string") &&
    typeof day.isHoliday === "boolean" &&
    (day.justificationType === undefined || typeof day.justificationType === "string")
  );
}

export function readMonthlyBreakdown(
  raw: string,
  year: number,
  month: number,
): DailyMetric[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const envelope = parsed as Record<string, unknown>;
    if (envelope.version !== CACHE_VERSION || !Array.isArray(envelope.days)) return null;
    const expectedDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (envelope.days.length !== expectedDays) return null;
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    const days: DailyMetric[] = [];
    for (let index = 0; index < expectedDays; index++) {
      const day: unknown = envelope.days[index];
      if (!isDailyMetric(day) || day.isoDate !== `${prefix}-${String(index + 1).padStart(2, "0")}`)
        return null;
      days.push(day);
    }
    return days;
  } catch {
    return null;
  }
}
