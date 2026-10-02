/**
 * One shift rendered as a calendar event. `startTime` / `endTime` are
 * "HH:mm" strings and are optional because a shift pattern may define only one
 * of the two bounds.
 */
export interface IcsShiftEvent {
  date: string;
  startTime?: string;
  endTime?: string;
  patternName: string;
}

export const exportShiftScheduleToICS = (
  events: IcsShiftEvent[],
  options: { calendarName: string; filename: string; employeeName: string },
) => {
  if (!events || events.length === 0) return;

  // Helpers
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const generateUID = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  let icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Portal Control//Turnos//ES",
    `X-WR-CALNAME:${options.calendarName}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ].join("\r\n");

  events.forEach((event) => {
    if (!event.startTime || !event.endTime) return;

    const startDateTime = new Date(event.date);
    const [startHour, startMinute] = event.startTime.split(":").map(Number);
    startDateTime.setHours(startHour, startMinute, 0);

    const endDateTime = new Date(event.date);
    const [endHour, endMinute] = event.endTime.split(":").map(Number);
    endDateTime.setHours(endHour, endMinute, 0);

    // Handle overnight shifts
    if (endDateTime < startDateTime) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }

    const description = `Turno: ${event.patternName}\\nEmpleado: ${options.employeeName}`;

    const eventBlock = [
      "BEGIN:VEVENT",
      `UID:${generateUID()}`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(startDateTime)}`,
      `DTEND:${formatDate(endDateTime)}`,
      `SUMMARY:${event.patternName}`,
      `DESCRIPTION:${description}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
    ].join("\r\n");

    icsContent += "\r\n" + eventBlock;
  });

  icsContent += "\r\nEND:VCALENDAR";

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = options.filename.endsWith(".ics")
      ? options.filename
      : `${options.filename}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
