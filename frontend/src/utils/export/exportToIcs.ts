import { addBusinessDaysCL, parseBusinessDateTimeCL } from "../timePolicy";
import { triggerBrowserDownload } from "../triggerBrowserDownload";

export interface IcsShiftEvent {
  date: string;
  startTime?: string;
  endTime?: string;
  patternName: string;
}

const escapeIcsText = (value: string): string =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");

// RFC 5545 folds lines at 75 octets, without splitting a UTF-8 character.
const foldLine = (line: string): string => {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let part = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > 75) {
      parts.push(part);
      part = " ";
      bytes = 1;
    }
    part += char;
    bytes += size;
  }
  parts.push(part);
  return parts.join("\r\n");
};

const formatDate = (date: Date): string =>
  date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

export const exportShiftScheduleToICS = (
  events: IcsShiftEvent[],
  options: { calendarName: string; filename: string; employeeName: string },
): boolean => {
  const blocks = events.flatMap((event) => {
    if (!event.startTime || !event.endTime) return [];
    const endDate = event.endTime < event.startTime ? addBusinessDaysCL(event.date, 1) : event.date;
    const start = parseBusinessDateTimeCL(event.date, event.startTime);
    const end = parseBusinessDateTimeCL(endDate, event.endTime);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start)
      return [];
    return [
      "BEGIN:VEVENT",
      `UID:${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}@portal-control`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(start)}`,
      `DTEND:${formatDate(end)}`,
      `SUMMARY:${escapeIcsText(event.patternName)}`,
      `DESCRIPTION:${escapeIcsText(`Turno: ${event.patternName}\nEmpleado: ${options.employeeName}`)}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
    ];
  });
  if (blocks.length === 0) return false;
  const content =
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Portal Control//Turnos//ES",
      `X-WR-CALNAME:${escapeIcsText(options.calendarName)}`,
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      ...blocks,
      "END:VCALENDAR",
    ]
      .map(foldLine)
      .join("\r\n") + "\r\n";
  triggerBrowserDownload(
    new Blob([content], { type: "text/calendar;charset=utf-8" }),
    options.filename.endsWith(".ics") ? options.filename : `${options.filename}.ics`,
  );
  return true;
};
