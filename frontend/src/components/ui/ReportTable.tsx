import React, { useMemo, memo } from "react";
import { DailyReportItem, ReportStat, SortableReportKey, ReportDataType } from "../../types/index";
import { motion } from "framer-motion";
import { getWeekStartDate, parseDateOnlyUTC } from "../../utils/dateUtils";
import { formatDecimalHoursToHHMM } from "../../utils/formatters";
import { TableCellsIcon } from "../ui/icons/index";
import SortableHeader from "./SortableHeader";
import PaginationControls from "./PaginationControls";
import ResponsiveView from "./ResponsiveView";
import ReportTableMobileSummaryCard from "./ReportTableMobileSummaryCard";
import ReportTableMobileDailyCard from "./ReportTableMobileDailyCard";
import EmptyState from "./EmptyState";

const REPORT_ITEMS_PER_PAGE = 40;

interface ReportSubtotal {
  type: "subtotal" | "total";
  weekId: string;
  totals: {
    scheduledHours: number;
    colacionMinutes: number;
    workedHours: number;
    differenceHours: number;
  };
}

type ReportSortConfig = { key: SortableReportKey; direction: "ascending" | "descending" } | null;

type ReportTableProps = {
  reportData: ReportDataType;
  isSingleEmployeeReport: boolean;
  sortConfig: ReportSortConfig;
  requestSort: (key: SortableReportKey) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  justificationStyles: Record<string, string>;
};

/**
 * `SortableHeader` only ever reads `keyof T`, so any row shape whose keys are the
 * sortable report keys satisfies it. Declaring the type parameter once here lets every
 * header below bind it explicitly instead of casting each prop.
 */
type ReportHeaderRowShape = Record<SortableReportKey, unknown>;

const ReportTable: React.FC<ReportTableProps> = ({
  reportData,
  isSingleEmployeeReport,
  sortConfig,
  requestSort,
  currentPage,
  setCurrentPage,
  justificationStyles,
}) => {
  const reportRowsWithSubtotals = useMemo(() => {
    if (!isSingleEmployeeReport || !reportData || reportData.length === 0) {
      return reportData;
    }

    const data = reportData as DailyReportItem[];
    const groupedByWeek: { [weekId: string]: DailyReportItem[] } = {};

    data.forEach((item) => {
      const dateStr = item.isoDate || item.date;
      if (!dateStr) return; // Skip if no date field is available
      const weekId = getWeekStartDate(parseDateOnlyUTC(dateStr)).toISOString();
      if (!groupedByWeek[weekId]) groupedByWeek[weekId] = [];
      groupedByWeek[weekId].push(item);
    });

    const finalRows: (DailyReportItem | ReportSubtotal)[] = [];
    const sortedWeekIds = Object.keys(groupedByWeek).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );

    sortedWeekIds.forEach((weekId) => {
      const weekItems = groupedByWeek[weekId];
      finalRows.push(...weekItems);
      const subtotal = weekItems.reduce(
        (acc, curr) => ({
          scheduledHours: acc.scheduledHours + curr.scheduledHours,
          colacionMinutes: acc.colacionMinutes + curr.colacionMinutes,
          workedHours: acc.workedHours + curr.workedHours,
          differenceHours: acc.differenceHours + curr.differenceHours,
        }),
        { scheduledHours: 0, colacionMinutes: 0, workedHours: 0, differenceHours: 0 },
      );
      finalRows.push({ type: "subtotal", weekId: weekId, totals: subtotal });
    });

    if (data.length > 0) {
      const grandTotal = data.reduce(
        (acc, curr) => ({
          scheduledHours: acc.scheduledHours + curr.scheduledHours,
          colacionMinutes: acc.colacionMinutes + curr.colacionMinutes,
          workedHours: acc.workedHours + curr.workedHours,
          differenceHours: acc.differenceHours + curr.differenceHours,
        }),
        { scheduledHours: 0, colacionMinutes: 0, workedHours: 0, differenceHours: 0 },
      );

      finalRows.push({ type: "total", weekId: "grand-total", totals: grandTotal });
    }

    return finalRows;
  }, [isSingleEmployeeReport, reportData]);

  const dataToPaginate = isSingleEmployeeReport ? reportRowsWithSubtotals : reportData;

  const totalPages = useMemo(() => {
    if (!dataToPaginate) return 1;
    return Math.ceil(dataToPaginate.length / REPORT_ITEMS_PER_PAGE);
  }, [dataToPaginate]);

  const paginatedData = useMemo(() => {
    if (!dataToPaginate) return [];
    const startIndex = (currentPage - 1) * REPORT_ITEMS_PER_PAGE;
    return dataToPaginate.slice(startIndex, startIndex + REPORT_ITEMS_PER_PAGE);
  }, [dataToPaginate, currentPage]);

  const renderSummaryTable = () => (
    <div className="overflow-hidden rounded-lg border border-black/10 dark:border-white/5 shadow-sm bg-white dark:bg-gray-900">
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-black/10 dark:border-white/5">
            <SortableHeader<ReportHeaderRowShape>
              title="Nombre"
              sortKey="name"
              sortConfig={sortConfig}
              onSort={requestSort}
              className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500"
            />
            <SortableHeader<ReportHeaderRowShape>
              title="Días Prog."
              sortKey="scheduledDays"
              sortConfig={sortConfig}
              onSort={requestSort}
              className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500"
            />
            <SortableHeader<ReportHeaderRowShape>
              title="Hrs. Prog."
              sortKey="totalHoursScheduled"
              sortConfig={sortConfig}
              onSort={requestSort}
              className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500"
            />
            <SortableHeader<ReportHeaderRowShape>
              title="Días Trab."
              sortKey="workedDays"
              sortConfig={sortConfig}
              onSort={requestSort}
              className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500"
            />
            <SortableHeader<ReportHeaderRowShape>
              title="Hrs. Trab."
              sortKey="totalHoursWorked"
              sortConfig={sortConfig}
              onSort={requestSort}
              className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500"
            />
            <SortableHeader<ReportHeaderRowShape>
              title="Diferencia"
              sortKey="differenceHours"
              sortConfig={sortConfig}
              onSort={requestSort}
              className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500"
            />
            <SortableHeader<ReportHeaderRowShape>
              title="Atrasos"
              sortKey="tardinessIncidents"
              sortConfig={sortConfig}
              onSort={requestSort}
              className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500"
            />
            <SortableHeader<ReportHeaderRowShape>
              title="Ausencias"
              sortKey="absenceDays"
              sortConfig={sortConfig}
              onSort={requestSort}
              className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500"
            />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 dark:divide-white/5">
          {(paginatedData as ReportStat[]).map((stat) => (
            <tr
              key={stat.employeeId}
              className="group hover:bg-sap-blue/5 dark:hover:bg-white/5 transition-all duration-300"
            >
              <td className="px-8 py-5 whitespace-nowrap text-sm font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight italic">
                {stat.name}
              </td>
              <td className="px-6 py-5 whitespace-nowrap text-xs font-bold text-gray-600 dark:text-gray-400">
                {stat.scheduledDays}
              </td>
              <td className="px-6 py-5 whitespace-nowrap text-xs font-bold text-gray-600 dark:text-gray-400 font-mono italic">
                {formatDecimalHoursToHHMM(stat.totalHoursScheduled)}
              </td>
              <td className="px-6 py-5 whitespace-nowrap text-xs font-bold text-gray-600 dark:text-gray-400">
                {stat.workedDays}
              </td>
              <td className="px-6 py-5 whitespace-nowrap text-xs font-bold text-gray-600 dark:text-gray-400 font-mono italic">
                {formatDecimalHoursToHHMM(stat.totalHoursWorked)}
              </td>
              <td
                className={`px-6 py-5 whitespace-nowrap text-xs font-black italic ${stat.differenceHours >= 0 ? "text-green-600 dark:text-green-400" : "text-rose-600 dark:text-rose-400"}`}
              >
                {formatDecimalHoursToHHMM(stat.differenceHours)}
              </td>
              <td
                className={`px-6 py-5 whitespace-nowrap text-xs font-black ${stat.tardinessIncidents > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-400 dark:text-gray-600"}`}
              >
                {stat.tardinessIncidents}
              </td>
              <td
                className={`px-6 py-5 whitespace-nowrap text-xs font-black ${stat.absenceDays > 0 ? "text-rose-600 dark:text-rose-400" : "text-gray-400 dark:text-gray-600"}`}
              >
                {stat.absenceDays}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderDailyTable = () => (
    <div className="overflow-hidden rounded-lg border border-black/10 dark:border-white/5 shadow-sm bg-white dark:bg-gray-900">
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-black/10 dark:border-white/5">
            <SortableHeader<ReportHeaderRowShape>
              title="Fecha"
              sortKey="isoDate"
              sortConfig={sortConfig}
              onSort={requestSort}
              className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500"
            />
            <SortableHeader<ReportHeaderRowShape>
              title="Día"
              sortKey="dayOfWeek"
              sortConfig={sortConfig}
              onSort={requestSort}
              className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500"
            />
            <SortableHeader<ReportHeaderRowShape>
              title="Turno Prog."
              sortKey="scheduledShift"
              sortConfig={sortConfig}
              onSort={requestSort}
              className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500"
            />
            <SortableHeader<ReportHeaderRowShape>
              title="Marcaje Real"
              sortKey="actualClocks"
              sortConfig={sortConfig}
              onSort={requestSort}
              className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500"
            />
            <SortableHeader<ReportHeaderRowShape>
              title="Hrs. Prog."
              sortKey="scheduledHours"
              sortConfig={sortConfig}
              onSort={requestSort}
              className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500"
            />
            <SortableHeader<ReportHeaderRowShape>
              title="Colación"
              sortKey="colacionMinutes"
              sortConfig={sortConfig}
              onSort={requestSort}
              className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500"
            />
            <SortableHeader<ReportHeaderRowShape>
              title="Hrs. Trab."
              sortKey="workedHours"
              sortConfig={sortConfig}
              onSort={requestSort}
              className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500"
            />
            <SortableHeader<ReportHeaderRowShape>
              title="Diferencia"
              sortKey="differenceHours"
              sortConfig={sortConfig}
              onSort={requestSort}
              className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500"
            />
            <SortableHeader<ReportHeaderRowShape>
              title="Estado"
              sortKey="justificationType"
              sortConfig={sortConfig}
              onSort={requestSort}
              className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500"
            />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 dark:divide-white/5">
          {(paginatedData as (DailyReportItem | ReportSubtotal)[]).map((item, index) => {
            if ("type" in item) {
              if (item.type === "subtotal")
                return (
                  <tr
                    key={`subtotal - ${item.weekId} `}
                    className="bg-sap-blue/5 dark:bg-white/5 font-black text-[9px] uppercase tracking-[0.3em]"
                  >
                    <td
                      colSpan={4}
                      className="px-8 py-4 text-right text-sap-blue italic opacity-70"
                    >
                      Resumen Semanal
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300 font-mono italic">
                      {formatDecimalHoursToHHMM(item.totals.scheduledHours)}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300 font-mono italic">
                      {formatDecimalHoursToHHMM(item.totals.colacionMinutes / 60)}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300 font-mono italic">
                      {formatDecimalHoursToHHMM(item.totals.workedHours)}
                    </td>
                    <td
                      className={`px - 6 py - 4 font - black italic ${item.totals.differenceHours >= 0 ? "text-green-600 dark:text-green-400" : "text-rose-600 dark:text-rose-400"} `}
                    >
                      {formatDecimalHoursToHHMM(item.totals.differenceHours)}
                    </td>
                    <td className="px-8 py-4"></td>
                  </tr>
                );
              if (item.type === "total")
                return (
                  <tr
                    key={`total - ${item.weekId} `}
                    className="bg-linear-to-r from-sap-blue to-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl relative overflow-hidden"
                  >
                    <td colSpan={4} className="px-8 py-6 text-right opacity-80 italic">
                      Corte de Periodo Finalizado
                    </td>
                    <td className="px-6 py-6 font-mono italic">
                      {formatDecimalHoursToHHMM(item.totals.scheduledHours)}
                    </td>
                    <td className="px-6 py-6 font-mono italic">
                      {formatDecimalHoursToHHMM(item.totals.colacionMinutes / 60)}
                    </td>
                    <td className="px-6 py-6 font-mono italic">
                      {formatDecimalHoursToHHMM(item.totals.workedHours)}
                    </td>
                    <td
                      className={`px - 6 py - 6 font - black italic text - md ${item.totals.differenceHours >= 0 ? "text-green-300" : "text-rose-300"} `}
                    >
                      {formatDecimalHoursToHHMM(item.totals.differenceHours)}
                    </td>
                    <td className="px-8 py-6"></td>
                  </tr>
                );
              return null;
            }
            const dailyItem = item as DailyReportItem;
            const isJustified = !!dailyItem.justificationType;
            return (
              <tr
                key={String(dailyItem.isoDate) + index}
                className={`group hover: bg - sap - blue / 5 dark: hover: bg - white / 5 transition - all duration - 300 ${isJustified ? "bg-gray-50/20 dark:bg-white/2" : ""} `}
              >
                <td className="px-8 py-5 whitespace-nowrap text-xs font-bold text-gray-600 dark:text-gray-400 font-mono">
                  {dailyItem.date}
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-xs font-black text-gray-500 dark:text-gray-600 uppercase italic">
                  {dailyItem.dayOfWeek}
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-xs font-black text-sap-blue dark:text-blue-400 uppercase tracking-tighter italic">
                  {dailyItem.scheduledShift}
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-xs font-medium text-gray-600 dark:text-gray-400 font-mono">
                  {dailyItem.actualClocks}
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-xs font-bold text-gray-600 dark:text-gray-400 font-mono italic">
                  {formatDecimalHoursToHHMM(dailyItem.scheduledHours)}
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-xs text-gray-500 font-mono italic">
                  {dailyItem.colacionMinutes.toFixed(0)}m
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-xs font-bold text-gray-600 dark:text-gray-400 font-mono italic">
                  {formatDecimalHoursToHHMM(dailyItem.workedHours)}
                </td>
                <td
                  className={`px-6 py-5 whitespace-nowrap text-xs font-black italic ${dailyItem.differenceHours >= 0 ? "text-green-600 dark:text-green-400" : "text-rose-600 dark:text-rose-400"}`}
                >
                  {formatDecimalHoursToHHMM(dailyItem.differenceHours)}
                </td>
                <td className="px-8 py-5 whitespace-nowrap text-center">
                  {dailyItem.justificationType ? (
                    <span
                      className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-tighter rounded-xl shadow-sm ${justificationStyles[dailyItem.justificationType] || ""}`}
                    >
                      {dailyItem.justificationType}
                    </span>
                  ) : (
                    <span className="text-gray-200 dark:text-gray-800">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderMobileView = () => (
    <div className="space-y-6 py-4">
      {isSingleEmployeeReport
        ? (paginatedData as (DailyReportItem | ReportSubtotal)[]).map((item, index) => {
            if ("type" in item) {
              if (item.type === "subtotal")
                return (
                  <div
                    key={`subtotal - mob - ${item.weekId} `}
                    className="p-5 rounded-4xl bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-xl"
                  >
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-sap-blue block text-center mb-4 italic">
                      CORTE SEMANAL
                    </span>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center bg-white/30 dark:bg-black/20 p-3 rounded-2xl border border-white/20">
                        <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">
                          Colación
                        </div>
                        <div className="text-sm font-black text-gray-800 dark:text-gray-100 font-mono italic">
                          {formatDecimalHoursToHHMM(item.totals.colacionMinutes / 60)}
                        </div>
                      </div>
                      <div className="text-center bg-white/30 dark:bg-black/20 p-3 rounded-2xl border border-white/20">
                        <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">
                          Diferencia
                        </div>
                        <div
                          className={`text - sm font - black italic ${item.totals.differenceHours >= 0 ? "text-green-600" : "text-rose-600"} `}
                        >
                          {formatDecimalHoursToHHMM(item.totals.differenceHours)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              if (item.type === "total")
                return (
                  <div
                    key={`total - mob - ${item.weekId} `}
                    className="p-8 rounded-[2.5rem] bg-linear-to-br from-sap-blue to-indigo-800 text-white shadow-2xl relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform duration-1000"></div>
                    <span className="text-[11px] font-black uppercase tracking-[0.4em] opacity-80 block text-center mb-6 italic">
                      RESUMEN CONSOLIDADO
                    </span>
                    <div className="space-y-4 relative z-10">
                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 flex justify-between items-center px-8">
                        <div className="text-[10px] font-black opacity-70 uppercase tracking-widest italic">
                          Horas Ciclo
                        </div>
                        <div className="text-2xl font-black font-mono tracking-tighter italic">
                          {formatDecimalHoursToHHMM(item.totals.workedHours)}
                        </div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 flex justify-between items-center px-8">
                        <div className="text-[10px] font-black opacity-70 uppercase tracking-widest italic">
                          Dif. Total
                        </div>
                        <div
                          className={`text-2xl font-black font-mono tracking-tighter italic ${item.totals.differenceHours >= 0 ? "text-green-300" : "text-rose-300"}`}
                        >
                          {formatDecimalHoursToHHMM(item.totals.differenceHours)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              return null;
            }
            const dailyItem = item as DailyReportItem;
            return (
              <ReportTableMobileDailyCard
                key={`${dailyItem.isoDate} -${index} `}
                item={dailyItem}
                justificationStyles={justificationStyles}
              />
            );
          })
        : (paginatedData as ReportStat[]).map((stat) => (
            <ReportTableMobileSummaryCard key={stat.employeeId} stat={stat} />
          ))}
    </div>
  );

  return (
    <div className="space-y-10">
      {/* Top Pagination Capsule */}
      <div className="flex justify-center">
        <div className="bg-white dark:bg-gray-900 rounded-full border border-black/10 dark:border-white/5 p-1 shadow-sm px-6">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
          />
        </div>
      </div>

      <ResponsiveView
        mobile={renderMobileView()}
        desktop={
          <div className="no-scrollbar perspective-1000">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              {isSingleEmployeeReport ? renderDailyTable() : renderSummaryTable()}
            </motion.div>
          </div>
        }
      />

      {/* Bottom Pagination & Metadata */}
      <div className="flex flex-col items-center gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-full border border-black/10 dark:border-white/5 p-1 shadow-sm px-6">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
          />
        </div>

        {!reportData || reportData.length === 0 ? (
          <EmptyState
            icon={<TableCellsIcon />}
            title="Sin Datos Técnicos"
            description="Ajuste los parámetros de filtro para compilar la vista."
            className="w-full py-20"
          />
        ) : (
          paginatedData.length === 0 &&
          currentPage > 1 && (
            <div className="text-center py-10 opacity-40">
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400">
                FIN DEL ARCHIVO ANALÍTICO
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
};
export default memo(ReportTable);
