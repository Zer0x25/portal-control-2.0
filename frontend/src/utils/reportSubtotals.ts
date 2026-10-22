import { DailyReportItem } from "../types/index";
import { getWeekStartDate, parseDateOnlyUTC } from "./dateUtils";

/**
 * Subtotales de la tabla de reportes (spec 036 T15).
 *
 * Función **pura** extraída de `ReportTable.tsx` para que sea testeable sin
 * renderizar nada. El **sort se resuelve antes** de llamar a esta función
 * (el controller ordena los datos base; aquí solo se intercalan las filas
 * `{ type: "subtotal" }` y `{ type: "total" }` entre los días).
 */

export interface ReportTotals {
  scheduledHours: number;
  colacionMinutes: number;
  workedHours: number;
  differenceHours: number;
}

export type ReportSubtotal = {
  type: "subtotal" | "total";
  weekId: string;
  totals: ReportTotals;
};

export type ReportRow = DailyReportItem | ReportSubtotal;

const ZERO_TOTALS: ReportTotals = {
  scheduledHours: 0,
  colacionMinutes: 0,
  workedHours: 0,
  differenceHours: 0,
};

const sumTotals = (items: DailyReportItem[]): ReportTotals =>
  items.reduce(
    (acc, curr) => ({
      scheduledHours: acc.scheduledHours + curr.scheduledHours,
      colacionMinutes: acc.colacionMinutes + curr.colacionMinutes,
      workedHours: acc.workedHours + curr.workedHours,
      differenceHours: acc.differenceHours + curr.differenceHours,
    }),
    { ...ZERO_TOTALS },
  );

/**
 * Calcula la semana (lunes UTC) de un día de reporte. Devuelve `null` si el
 * item no tiene fecha.
 */
export const getReportWeekId = (item: DailyReportItem): string | null => {
  const dateStr = item.isoDate || item.date;
  if (!dateStr) return null;
  return getWeekStartDate(parseDateOnlyUTC(dateStr)).toISOString();
};

/**
 * Construye las filas del reporte diario, intercalando un subtotal por semana
 * y un total general al final. No ordena: el caller debe pasar los datos ya
 * ordenados.
 */
export const isReportSubtotal = (row: ReportRow): row is ReportSubtotal =>
  (row as ReportSubtotal).type === "subtotal" || (row as ReportSubtotal).type === "total";

export const buildReportRowsWithSubtotals = (data: DailyReportItem[]): ReportRow[] => {
  const groupedByWeek: { [weekId: string]: DailyReportItem[] } = {};

  data.forEach((item) => {
    const weekId = getReportWeekId(item);
    if (!weekId) return; // Skip if no date field is available
    if (!groupedByWeek[weekId]) groupedByWeek[weekId] = [];
    groupedByWeek[weekId].push(item);
  });

  const finalRows: ReportRow[] = [];
  const sortedWeekIds = Object.keys(groupedByWeek).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );

  sortedWeekIds.forEach((weekId) => {
    const weekItems = groupedByWeek[weekId];
    finalRows.push(...weekItems);
    finalRows.push({ type: "subtotal", weekId, totals: sumTotals(weekItems) });
  });

  if (data.length > 0) {
    finalRows.push({ type: "total", weekId: "grand-total", totals: sumTotals(data) });
  }

  return finalRows;
};
