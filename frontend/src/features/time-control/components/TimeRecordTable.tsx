import React, { Suspense } from "react";
import { DailyTimeRecord, AugmentedTimeRecord } from "../../../types/index";
import Button from "../../../components/ui/Button";
import PremiumSearchInput from "../../../components/ui/PremiumSearchInput";
import { motion, AnimatePresence } from "framer-motion";
import {
  TableCellsIcon,
  PrinterIcon,
  ExportIcon,
  DocumentTextIcon,
} from "../../../components/ui/icons/index";
import ResponsiveView from "../../../components/ui/ResponsiveView";
import LazySectionFallback from "../../../components/ui/LazySectionFallback";
import { useTimeRecordTableController } from "../hooks/useTimeRecordTableController";

// Lazy load table views for better performance
const TimeRecordTableViewDesktop = React.lazy(() => import("./TimeRecordTableViewDesktop"));
const TimeRecordTableViewMobile = React.lazy(() => import("./TimeRecordTableViewMobile"));

interface TimeRecordTableProps {
  records: AugmentedTimeRecord[];
  // Infinite Scroll Props
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading?: boolean;

  onRowDoubleClick: (record: AugmentedTimeRecord) => void;
  onAddComment: (record: DailyTimeRecord) => void;
  onDelete: (record: DailyTimeRecord) => void;
  isActionDisabledForRole: boolean;
  roleBasedTooltip: string;
  accountingLockDate: string | null;
  isControlInternoEnabled: boolean;
  // Search Props
  searchName: string;
  onSearchChange: (name: string) => void;
  onExportStreaming: (format: "csv" | "excel") => void;
  onViewHistory: (record: DailyTimeRecord) => void;
  filtersKey?: string;
}

const TimeRecordTable: React.FC<TimeRecordTableProps> = React.memo(
  ({
    records,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    onRowDoubleClick,
    onAddComment,
    onDelete,
    isActionDisabledForRole,
    roleBasedTooltip,
    accountingLockDate,
    isControlInternoEnabled,
    searchName,
    onSearchChange,
    onExportStreaming,
    onViewHistory,
    filtersKey: _filtersKey,
  }) => {
    const {
      editsMapAll,
      exportMenuRef,
      handleExport,
      isExportMenuOpen,
      pendingRequestsMap,
      setIsExportMenuOpen,
    } = useTimeRecordTableController({
      records,
      onExportStreaming,
    });

    return (
      <div className="space-y-6">
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row gap-6 justify-between items-end mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-md bg-sap-blue border border-sap-blue shadow-lg shadow-sap-blue/20">
                <TableCellsIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Registros de Horario
                </h3>
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">
                  VISUALIZACIÓN Y GESTIÓN TÉCNICA DE MARCAJES
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search Input */}
              <div className="w-full md:w-80">
                <PremiumSearchInput
                  value={searchName}
                  onChange={onSearchChange}
                  placeholder="Buscar por nombre..."
                  shortcut="Ctrl+F"
                />
              </div>

              <div className="relative" ref={exportMenuRef}>
                <Button
                  onClick={() => setIsExportMenuOpen((prev) => !prev)}
                  variant="secondary"
                  className="flex items-center gap-3 h-11 px-6 rounded-md font-black uppercase tracking-widest text-[10px] bg-token-surface-card border border-token-border-technical hover:bg-token-surface-hover shadow-sm"
                >
                  <ExportIcon className="w-4 h-4 text-sap-blue" />
                  <span className="hidden sm:inline">Exportar Datos</span>
                </Button>

                <AnimatePresence>
                  {isExportMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-64 rounded-md shadow-2xl bg-token-surface-card border border-token-border-technical overflow-hidden z-50 p-1"
                    >
                      <div className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-token-text-tertiary border-b border-token-border-subtle mb-1">
                        Seleccionar Formato de Salida
                      </div>
                      <button
                        onClick={() => handleExport("csv")}
                        className="flex items-center w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-token-text-primary hover:bg-sap-blue hover:text-white rounded transition-colors"
                      >
                        <DocumentTextIcon className="w-4 h-4 mr-3" /> Standard CSV
                      </button>
                      <button
                        onClick={() => handleExport("excel")}
                        className="flex items-center w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-gray-300 hover:bg-sap-blue hover:text-white rounded transition-colors"
                      >
                        <TableCellsIcon className="w-4 h-4 mr-3" /> Microsoft Excel
                      </button>
                      <button
                        onClick={() => handleExport("pdf")}
                        className="flex items-center w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-gray-300 hover:bg-sap-blue hover:text-white rounded transition-colors"
                      >
                        <PrinterIcon className="w-4 h-4 mr-3" /> Imprimir Documento
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="mb-8 relative min-h-[400px]">
            <ResponsiveView
              mobile={
                <Suspense fallback={<LazySectionFallback rows={6} className="px-2 py-8" />}>
                  <TimeRecordTableViewMobile
                    records={records}
                    fetchNextPage={fetchNextPage}
                    hasNextPage={hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                    isLoading={!!isLoading}
                    onRowDoubleClick={onRowDoubleClick}
                    onAddComment={onAddComment}
                    onDelete={onDelete}
                    isActionDisabledForRole={isActionDisabledForRole}
                    accountingLockDate={accountingLockDate}
                    isControlInternoEnabled={isControlInternoEnabled}
                    pendingRequestsMap={pendingRequestsMap}
                  />
                </Suspense>
              }
              desktop={
                <Suspense fallback={<LazySectionFallback rows={8} className="px-2 py-8" />}>
                  <TimeRecordTableViewDesktop
                    records={records}
                    fetchNextPage={fetchNextPage}
                    hasNextPage={hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                    isLoading={!!isLoading}
                    onRowDoubleClick={onRowDoubleClick}
                    onAddComment={onAddComment}
                    onDelete={onDelete}
                    isActionDisabledForRole={isActionDisabledForRole}
                    roleBasedTooltip={roleBasedTooltip}
                    accountingLockDate={accountingLockDate}
                    isControlInternoEnabled={isControlInternoEnabled}
                    onViewHistory={onViewHistory}
                    editsMapAll={editsMapAll}
                    pendingRequestsMap={pendingRequestsMap}
                  />
                </Suspense>
              }
            />
          </div>
          {isActionDisabledForRole && (
            <div className="flex justify-center mt-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-token-status-error bg-token-status-error/5 px-4 py-2 rounded-md border border-token-status-error/20">
                {roleBasedTooltip}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  },
);

export default TimeRecordTable;
