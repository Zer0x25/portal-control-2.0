import React from "react";
import { DailyReportItem, ReportDataType, ReportStat, SortableReportKey } from "../../types/index";
import { TableCellsIcon } from "../ui/icons/index";
import DataTable from "./DataTable";
import DataTableHeader, { getDataTableColumnMeta } from "./DataTableHeader";
import DataTableRow from "./DataTableRow";
import PaginationControls from "./PaginationControls";
import ReportTableMobileSummaryCard from "./ReportTableMobileSummaryCard";
import ReportTableMobileDailyCard from "./ReportTableMobileDailyCard";
import EmptyState from "./EmptyState";
import { Z } from "../../constants/zScale";
import { formatDecimalHoursToHHMM as fmt } from "../../utils/formatters";
import {
  reportTableFeatures,
  useReportTable,
  isReportSubtotal,
  type ReportSortConfig,
} from "../../hooks/useReportTable";
import { ReportRow, ReportSubtotal } from "../../utils/reportSubtotals";
import { ColumnDef, FlexRender } from "@tanstack/react-table";

export type { ReportSubtotal };

interface ReportTableProps {
  reportData: ReportDataType | null;
  isSingleEmployeeReport: boolean;
  sortConfig: ReportSortConfig;
  requestSort: (key: SortableReportKey) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  justificationStyles: Record<string, string>;
}

const ReportTable: React.FC<ReportTableProps> = ({
  reportData,
  isSingleEmployeeReport,
  sortConfig,
  requestSort,
  currentPage,
  setCurrentPage,
  justificationStyles,
}) => {
  const summaryColumns = [
    {
      id: "name",
      accessorFn: () => null,
      header: "Nombre",
      cell: ({ row }) => (row.original as unknown as ReportStat).name,
      meta: {
        headerClassName: "px-8 py-5 typo-list-header text-token-text-tertiary",
        cellClassName:
          "px-8 py-5 whitespace-nowrap typo-list-primary text-token-text-primary uppercase",
      },
    },
    {
      id: "scheduledDays",
      accessorFn: () => null,
      header: "Días Prog.",
      cell: ({ row }) => (row.original as unknown as ReportStat).scheduledDays,
      meta: {
        headerClassName: "px-6 py-5 typo-list-header text-token-text-tertiary",
        cellClassName: "px-6 py-5 whitespace-nowrap typo-list-value text-token-text-secondary",
      },
    },
    {
      id: "totalHoursScheduled",
      accessorFn: () => null,
      header: "Hrs. Prog.",
      cell: ({ row }) => fmt((row.original as unknown as ReportStat).totalHoursScheduled),
      meta: {
        headerClassName: "px-6 py-5 typo-list-header text-token-text-tertiary",
        cellClassName: "px-6 py-5 whitespace-nowrap typo-list-value text-token-text-secondary",
      },
    },
    {
      id: "workedDays",
      accessorFn: () => null,
      header: "Días Trab.",
      cell: ({ row }) => (row.original as unknown as ReportStat).workedDays,
      meta: {
        headerClassName: "px-6 py-5 typo-list-header text-token-text-tertiary",
        cellClassName: "px-6 py-5 whitespace-nowrap typo-list-value text-token-text-secondary",
      },
    },
    {
      id: "totalHoursWorked",
      accessorFn: () => null,
      header: "Hrs. Trab.",
      cell: ({ row }) => fmt((row.original as unknown as ReportStat).totalHoursWorked),
      meta: {
        headerClassName: "px-6 py-5 typo-list-header text-token-text-tertiary",
        cellClassName: "px-6 py-5 whitespace-nowrap typo-list-value text-token-text-primary",
      },
    },
    {
      id: "differenceHours",
      accessorFn: () => null,
      header: "Diferencia",
      cell: ({ row }) => {
        const stat = row.original as unknown as ReportStat;
        return (
          <span
            className={
              stat.differenceHours >= 0 ? "text-token-status-success" : "text-token-status-error"
            }
          >
            {fmt(stat.differenceHours)}
          </span>
        );
      },
      meta: {
        headerClassName: "px-6 py-5 typo-list-header text-token-text-tertiary",
        cellClassName: "px-6 py-5 whitespace-nowrap typo-list-value",
      },
    },
    {
      id: "tardinessIncidents",
      accessorFn: () => null,
      header: "Atrasos",
      cell: ({ row }) => {
        const stat = row.original as unknown as ReportStat;
        return (
          <span
            className={
              stat.tardinessIncidents > 0 ? "text-token-status-warning" : "text-token-text-tertiary"
            }
          >
            {stat.tardinessIncidents}
          </span>
        );
      },
      meta: {
        headerClassName: "px-6 py-5 typo-list-header text-token-text-tertiary",
        cellClassName: "px-6 py-5 whitespace-nowrap typo-list-value",
      },
    },
    {
      id: "absenceDays",
      accessorFn: () => null,
      header: "Ausencias",
      cell: ({ row }) => {
        const stat = row.original as unknown as ReportStat;
        return (
          <span
            className={
              stat.absenceDays > 0 ? "text-token-status-error" : "text-token-text-tertiary"
            }
          >
            {stat.absenceDays}
          </span>
        );
      },
      meta: {
        headerClassName: "px-6 py-5 typo-list-header text-token-text-tertiary",
        cellClassName: "px-6 py-5 whitespace-nowrap typo-list-value",
      },
    },
  ] as ColumnDef<typeof reportTableFeatures, ReportRow>[];

  const dailyColumns = [
    {
      id: "isoDate",
      accessorFn: () => null,
      header: "Fecha",
      cell: ({ row }) =>
        isReportSubtotal(row.original) ? null : (row.original as unknown as DailyReportItem).date,
      meta: {
        headerClassName: "px-6 py-5 typo-list-header text-token-text-tertiary",
        cellClassName: "px-6 py-5 whitespace-nowrap typo-list-value text-token-text-primary",
      },
    },
    {
      id: "dayOfWeek",
      accessorFn: () => null,
      header: "Día",
      cell: ({ row }) =>
        isReportSubtotal(row.original)
          ? null
          : (row.original as unknown as DailyReportItem).dayOfWeek,
      meta: {
        headerClassName: "px-6 py-5 typo-list-header text-token-text-tertiary",
        cellClassName: "px-6 py-5 whitespace-nowrap typo-list-secondary text-token-text-secondary",
      },
    },
    {
      id: "scheduledShift",
      accessorFn: () => null,
      header: "Turno Prog.",
      cell: ({ row }) =>
        isReportSubtotal(row.original)
          ? null
          : (row.original as unknown as DailyReportItem).scheduledShift,
      meta: {
        headerClassName: "px-6 py-5 typo-list-header text-token-text-tertiary",
        cellClassName:
          "px-6 py-5 whitespace-nowrap typo-list-secondary text-token-accent-brand uppercase",
      },
    },
    {
      id: "actualClocks",
      accessorFn: () => null,
      header: "Marcaje Real",
      cell: ({ row }) =>
        isReportSubtotal(row.original)
          ? null
          : (row.original as unknown as DailyReportItem).actualClocks,
      meta: {
        headerClassName: "px-6 py-5 typo-list-header text-token-text-tertiary",
        cellClassName: "px-6 py-5 whitespace-nowrap typo-list-value text-token-text-secondary",
      },
    },
    {
      id: "scheduledHours",
      accessorFn: () => null,
      header: "Hrs. Prog.",
      cell: ({ row }) =>
        isReportSubtotal(row.original)
          ? null
          : fmt((row.original as unknown as DailyReportItem).scheduledHours),
      meta: {
        headerClassName: "px-6 py-5 typo-list-header text-token-text-tertiary",
        cellClassName: "px-6 py-5 whitespace-nowrap typo-list-value text-token-text-secondary",
      },
    },
    {
      id: "colacionMinutes",
      accessorFn: () => null,
      header: "Colación",
      cell: ({ row }) =>
        isReportSubtotal(row.original)
          ? null
          : `${(row.original as unknown as DailyReportItem).colacionMinutes.toFixed(0)}m`,
      meta: {
        headerClassName: "px-6 py-5 typo-list-header text-token-text-tertiary",
        cellClassName: "px-6 py-5 whitespace-nowrap typo-list-value text-token-text-tertiary",
      },
    },
    {
      id: "workedHours",
      accessorFn: () => null,
      header: "Hrs. Trab.",
      cell: ({ row }) =>
        isReportSubtotal(row.original)
          ? null
          : fmt((row.original as unknown as DailyReportItem).workedHours),
      meta: {
        headerClassName: "px-6 py-5 typo-list-header text-token-text-tertiary",
        cellClassName: "px-6 py-5 whitespace-nowrap typo-list-value text-token-text-secondary",
      },
    },
    {
      id: "differenceHours",
      accessorFn: () => null,
      header: "Diferencia",
      cell: ({ row }) => {
        if (isReportSubtotal(row.original)) return null;
        const item = row.original as unknown as DailyReportItem;
        return (
          <span
            className={
              item.differenceHours >= 0 ? "text-token-status-success" : "text-token-status-error"
            }
          >
            {fmt(item.differenceHours)}
          </span>
        );
      },
      meta: {
        headerClassName: "px-6 py-5 typo-list-header text-token-text-tertiary",
        cellClassName: "px-6 py-5 whitespace-nowrap typo-list-value",
      },
    },
    {
      id: "justificationType",
      accessorFn: () => null,
      header: "Estado",
      cell: ({ row }) => {
        if (isReportSubtotal(row.original)) return null;
        const item = row.original as unknown as DailyReportItem;
        return item.justificationType ? (
          <span
            className={
              "px-3 py-1.5 typo-list-status uppercase tracking-normal rounded-xl shadow-sm " +
              (justificationStyles[item.justificationType] || "")
            }
          >
            {item.justificationType}
          </span>
        ) : (
          <span className="text-token-text-tertiary opacity-40">—</span>
        );
      },
      meta: {
        headerClassName: "px-8 py-5 typo-list-header text-token-text-tertiary",
        cellClassName: "px-8 py-5 whitespace-nowrap text-center",
      },
    },
  ] as ColumnDef<typeof reportTableFeatures, ReportRow>[];

  const columns = isSingleEmployeeReport ? dailyColumns : summaryColumns;

  const { table, pageRows, totalPages, rowCount } = useReportTable({
    reportData,
    isSingleEmployeeReport,
    columns,
    sortConfig,
    requestSort,
    currentPage,
    setCurrentPage,
  });

  const renderMobileView = () => (
    <div className="space-y-6 py-4">
      {isSingleEmployeeReport
        ? pageRows.map((row) => {
            const item = row.original;
            if (isReportSubtotal(item)) {
              if (item.type === "subtotal")
                return (
                  <div
                    key={`subtotal-mob-${item.weekId}`}
                    className="p-5 rounded-2xl bg-token-surface-card backdrop-blur-xl border border-token-border-subtle shadow-xl"
                  >
                    <span className="typo-list-header text-token-accent-brand block text-center mb-4">
                      CORTE SEMANAL
                    </span>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center bg-token-surface-active/50 p-3 rounded-2xl border border-token-border-subtle">
                        <div className="typo-list-secondary text-token-text-tertiary uppercase mb-1">
                          Colación
                        </div>
                        <div className="typo-list-value text-token-text-primary">
                          {fmt(item.totals.colacionMinutes / 60)}
                        </div>
                      </div>
                      <div className="text-center bg-token-surface-active/50 p-3 rounded-2xl border border-token-border-subtle">
                        <div className="typo-list-secondary text-token-text-tertiary uppercase mb-1">
                          Diferencia
                        </div>
                        <div
                          className={`typo-list-value ${item.totals.differenceHours >= 0 ? "text-token-status-success" : "text-token-status-error"}`}
                        >
                          {fmt(item.totals.differenceHours)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              if (item.type === "total")
                return (
                  <div
                    key={`total-mob-${item.weekId}`}
                    className="p-8 rounded-[2.5rem] bg-linear-to-br from-token-accent-brand to-indigo-800 text-token-text-onAccent shadow-2xl relative overflow-hidden group"
                  >
                    <div className="ambient-glow ambient-glow-light absolute top-0 right-0 w-32 h-32 -translate-y-1/2 translate-x-1/2 transition-transform duration-1000 group-hover:scale-125"></div>
                    <span className="typo-list-header opacity-80 block text-center mb-6">
                      RESUMEN CONSOLIDADO
                    </span>
                    <div className={`space-y-4 relative ${Z.sticky}`}>
                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 flex justify-between items-center px-8">
                        <div className="typo-list-secondary opacity-80 uppercase">Horas Ciclo</div>
                        <div className="text-2xl font-black font-mono tabular-nums">
                          {fmt(item.totals.workedHours)}
                        </div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 flex justify-between items-center px-8">
                        <div className="typo-list-secondary opacity-80 uppercase">Dif. Total</div>
                        <div
                          className={`text-2xl font-black font-mono tabular-nums ${item.totals.differenceHours >= 0 ? "text-green-300" : "text-rose-300"}`}
                        >
                          {fmt(item.totals.differenceHours)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              return null;
            }
            const dailyItem = item as unknown as DailyReportItem;
            return (
              <ReportTableMobileDailyCard
                key={`${dailyItem.isoDate}-${row.index}`}
                item={dailyItem}
                justificationStyles={justificationStyles}
              />
            );
          })
        : (pageRows.map((row) => row.original) as unknown as ReportStat[]).map((stat) => (
            <ReportTableMobileSummaryCard key={stat.employeeId} stat={stat} />
          ))}
    </div>
  );

  const renderDesktopRows = () => {
    if (isSingleEmployeeReport) {
      return pageRows.map((row) => {
        const item = row.original;
        if (isReportSubtotal(item)) {
          if (item.type === "subtotal")
            return (
              <DataTableRow
                key={`subtotal-${item.weekId}`}
                rowIndex={row.index}
                className="bg-token-surface-active typo-list-secondary uppercase tracking-wide"
              >
                <td colSpan={4} className="px-8 py-4 text-right text-token-accent-brand opacity-90">
                  Resumen Semanal
                </td>
                <td className="px-6 py-4 typo-list-value text-token-text-secondary">
                  {fmt(item.totals.scheduledHours)}
                </td>
                <td className="px-6 py-4 typo-list-value text-token-text-secondary">
                  {fmt(item.totals.colacionMinutes / 60)}
                </td>
                <td className="px-6 py-4 typo-list-value text-token-text-secondary">
                  {fmt(item.totals.workedHours)}
                </td>
                <td
                  className={`px-6 py-4 typo-list-value ${item.totals.differenceHours >= 0 ? "text-token-status-success" : "text-token-status-error"}`}
                >
                  {fmt(item.totals.differenceHours)}
                </td>
                <td className="px-8 py-4"></td>
              </DataTableRow>
            );
          if (item.type === "total")
            return (
              <DataTableRow
                key={`total-${item.weekId}`}
                rowIndex={row.index}
                className="bg-linear-to-r from-token-accent-brand to-indigo-700 text-token-text-onAccent typo-list-secondary uppercase tracking-wide shadow-2xl relative overflow-hidden"
              >
                <td colSpan={4} className="px-8 py-6 text-right opacity-80">
                  Corte de Periodo Finalizado
                </td>
                <td className="px-6 py-6 typo-list-value">{fmt(item.totals.scheduledHours)}</td>
                <td className="px-6 py-6 typo-list-value">
                  {fmt(item.totals.colacionMinutes / 60)}
                </td>
                <td className="px-6 py-6 typo-list-value">{fmt(item.totals.workedHours)}</td>
                <td
                  className={`px-6 py-6 typo-list-value ${item.totals.differenceHours >= 0 ? "text-green-300" : "text-rose-300"}`}
                >
                  {fmt(item.totals.differenceHours)}
                </td>
                <td className="px-8 py-6"></td>
              </DataTableRow>
            );
          return null;
        }
        const dailyItem = item as unknown as DailyReportItem;
        const isJustified = !!dailyItem.justificationType;
        return (
          <DataTableRow
            key={String(dailyItem.isoDate) + row.index}
            rowIndex={row.index}
            className={`group hover:bg-token-surface-hover transition-all duration-150 ${isJustified ? "bg-token-surface-stripe" : ""}`}
          >
            {row.getAllCells().map((cell) => (
              <td
                key={cell.id}
                className={getDataTableColumnMeta(cell.column.columnDef.meta).cellClassName}
              >
                <FlexRender cell={cell} />
              </td>
            ))}
          </DataTableRow>
        );
      });
    }
    return pageRows.map((row) => {
      const stat = row.original as unknown as ReportStat;
      return (
        <DataTableRow
          key={stat.employeeId}
          rowIndex={row.index}
          className="group hover:bg-token-surface-hover transition-all duration-150"
        >
          {row.getAllCells().map((cell) => (
            <td
              key={cell.id}
              className={getDataTableColumnMeta(cell.column.columnDef.meta).cellClassName}
            >
              <FlexRender cell={cell} />
            </td>
          ))}
        </DataTableRow>
      );
    });
  };

  return (
    <div data-list-group="data-table" className="@container space-y-10">
      {/* Top Pagination Capsule (mobile only; desktop uses DataTable's) */}
      <div className="flex justify-center @2xl:hidden">
        <div className="bg-token-surface-card rounded-full border border-token-border-technical p-1 shadow-sm px-6">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
          />
        </div>
      </div>

      <div className="@2xl:hidden">{renderMobileView()}</div>
      <div className="hidden @2xl:block no-scrollbar perspective-1000">
        <div className="animate-in fade-in [--tw-enter-translate-y:30px] [animation-duration:600ms]">
          <DataTable
            table={table}
            ariaLabel={
              isSingleEmployeeReport
                ? "Reporte diario del empleado"
                : "Resumen de reporte por empleado"
            }
            rowCount={rowCount}
            pagination={{
              currentPage,
              totalPages,
              setCurrentPage,
              position: "both",
              className: "flex justify-center",
            }}
            className="space-y-10"
          >
            <DataTableHeader
              table={table}
              rowClassName="bg-token-surface-header border-b border-token-border-technical"
              headerClassName=""
            />
            <tbody className="divide-y divide-token-border-subtle">{renderDesktopRows()}</tbody>
          </DataTable>
        </div>
      </div>

      {/* Bottom Pagination & Metadata */}
      <div className="flex flex-col items-center gap-6">
        <div className="flex justify-center @2xl:hidden">
          <div className="bg-token-surface-card rounded-full border border-token-border-technical p-1 shadow-sm px-6">
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              setCurrentPage={setCurrentPage}
            />
          </div>
        </div>

        {!reportData || reportData.length === 0 ? (
          <EmptyState
            icon={<TableCellsIcon />}
            title="Sin Datos Técnicos"
            description="Ajuste los parámetros de filtro para compilar la vista."
            className="w-full py-20"
          />
        ) : (
          pageRows.length === 0 &&
          currentPage > 1 && (
            <div className="text-center py-10 opacity-40">
              <p className="typo-list-secondary uppercase text-token-text-tertiary">
                FIN DEL ARCHIVO ANALÍTICO
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default ReportTable;
