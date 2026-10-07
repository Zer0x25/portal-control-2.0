import { getMinutesFromMidnightChile } from "./timeUtils";

/** Elapsed hours for instants; Chile wall-clock hours for legacy HH:mm marks. */
export function reportWorkedHours(entrada: string | null, salida: string | null): number {
  if (!entrada || !salida) return 0;
  const instant = (value: string): number | undefined => {
    if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return undefined;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : undefined;
  };
  const start = instant(entrada),
    end = instant(salida);
  if (start !== undefined && end !== undefined) return Math.max(0, (end - start) / 3600000);
  const minutes = (value: string, timestamp?: number): number | undefined => {
    if (timestamp !== undefined) return getMinutesFromMidnightChile(new Date(timestamp));
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return undefined;
    const [hours, mins] = value.split(":").map(Number);
    return hours * 60 + mins;
  };
  const startMinutes = minutes(entrada, start),
    endMinutes = minutes(salida, end);
  if (startMinutes === undefined || endMinutes === undefined) return 0;
  return ((endMinutes - startMinutes + 1440) % 1440) / 60;
}
