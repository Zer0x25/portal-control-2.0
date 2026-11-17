import { getDateRange } from "./dateUtils";

/** Represent the selected calendar date as UTC midnight, independently of browser zone. */
export const calendarAnchor = (date: Date): Date =>
  new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

export const calendarGrid = (mode: "month" | "week", date: Date): (Date | null)[] => {
  const { startDate, endDate } = getDateRange(mode, calendarAnchor(date));
  const cells: (Date | null)[] = [];
  if (mode === "month") {
    for (let i = 0; i < (startDate.getUTCDay() + 6) % 7; i++) cells.push(null);
  }
  for (const day = new Date(startDate); day <= endDate; day.setUTCDate(day.getUTCDate() + 1)) {
    cells.push(new Date(day));
  }
  while (cells.length % 7) cells.push(null);
  return cells;
};
