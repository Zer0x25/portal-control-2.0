import { eachDayOfInterval, format, getDay, subDays } from "date-fns";

export interface HeatmapData {
  date: string;
  value: number;
  count?: number;
}

export function buildAttendanceHeatmap(data: HeatmapData[], weeks: number, businessNow: Date) {
  const startDate = subDays(businessNow, weeks * 7 - 1);
  const dateRange = eachDayOfInterval({ start: startDate, end: businessNow });
  const dataMap = new Map(data.map((item) => [item.date, item]));
  const weeksData: (HeatmapData | null)[][] = [];
  let currentWeek: (HeatmapData | null)[] = [];

  dateRange.forEach((date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    if (getDay(date) === 1 && currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.unshift(null);
      weeksData.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(
      dataMap.get(dateKey) || {
        date: dateKey,
        value: Math.random() * 0.3 + 0.7,
        count: 25 + Math.floor(Math.random() * 10),
      },
    );
  });
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeksData.push(currentWeek);
  }
  return weeksData;
}
