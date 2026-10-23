import {
  tableFeatures,
  useTable,
  rowSortingFeature,
  rowPaginationFeature,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { DailyReportItem, ReportDataType, SortableReportKey } from "../types/index";
import {
  ReportRow,
  buildReportRowsWithSubtotals,
  isReportSubtotal as isReportSubtotalGuard,
} from "../utils/reportSubtotals";
import { DataTableColumnMeta } from "../components/ui/DataTableHeader";

export const REPORT_ITEMS_PER_PAGE = 40;

export const reportTableFeatures = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  columnMeta: {} as DataTableColumnMeta,
});

export type ReportSortConfig = {
  key: SortableReportKey;
  direction: "ascending" | "descending";
} | null;

export interface UseReportTableParams {
  reportData: ReportDataType | null;
  isSingleEmployeeReport: boolean;
  columns: ColumnDef<typeof reportTableFeatures, ReportRow>[];
  sortConfig: ReportSortConfig;
  requestSort: (key: SortableReportKey) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
}

export const isReportSubtotal = isReportSubtotalGuard;

export const useReportTable = ({
  reportData,
  isSingleEmployeeReport,
  columns,
  sortConfig,
  requestSort,
  currentPage,
  setCurrentPage,
}: UseReportTableParams) => {
  const rows = (() => {
    if (!reportData || reportData.length === 0) return [];
    if (!isSingleEmployeeReport) return reportData as ReportRow[];
    return buildReportRowsWithSubtotals(reportData as DailyReportItem[]);
  })() as ReportRow[];

  const sorting: SortingState = sortConfig
    ? [{ id: sortConfig.key, desc: sortConfig.direction === "descending" }]
    : [];

  const pageSize = REPORT_ITEMS_PER_PAGE;
  const pageStart = Math.max(0, (currentPage - 1) * pageSize);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  const table = useTable({
    features: reportTableFeatures,
    columns,
    data: rows,
    state: {
      sorting,
      pagination: { pageIndex: currentPage - 1, pageSize },
    },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const first = next[0];
      if (first) requestSort(first.id as SortableReportKey);
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function" ? updater({ pageIndex: currentPage - 1, pageSize }) : updater;
      setCurrentPage(next.pageIndex + 1);
    },
    manualSorting: true,
    manualPagination: true,
    rowCount: rows.length,
  });

  const pageRows = (() => {
    const all = table.getRowModel().rows;
    return all.slice(pageStart, pageStart + pageSize);
  })();

  return { table, rows, pageRows, totalPages, rowCount: rows.length };
};
