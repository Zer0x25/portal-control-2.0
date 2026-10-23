/**
 * 📊 ReportsTab Component
 * Refactored to use the unified Industrial-Elegant AuditMonthSelector.
 * Simplifies period selection to a monthly focus as requested.
 */
import React, { FC } from "react";
import {
  ExportIcon,
  DocumentTextIcon,
  TableCellsIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
  UsersIcon,
} from "../../../components/ui/icons/index";
import ReportTable from "../../../components/ui/ReportTable";
import ReportFilterPanel from "./ReportFilterPanel";
import PdfExportModeModal from "./PdfExportModeModal";
import { useReportsTabController } from "../hooks/useReportsTabController";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { Z } from "../../../constants/zScale";

const justificationStyles: Record<string, string> = {
  Vacaciones: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  "Licencia Médica": "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
  "Permiso Especial": "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
  Feriado: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
  "Feriado Trabajado": "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  "Ausencia no justificada": "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  Anomalía: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
};

const ReportsTab: FC = () => {
  const {
    currentPage,
    exportMenuRef,
    filters,
    handleExport,
    handleExportPdfCompiled,
    handleExportPdfSummary,
    handleFiltersChange,
    handleGenerateReport,
    isExportMenuOpen,
    isLoading,
    isSingleEmployeeReport,
    reportData,
    requestSort,
    setCurrentPage,
    setIsExportMenuOpen,
    setShowPdfModeModal,
    showPdfModeModal,
    sortConfig,
    sortedReportData,
  } = useReportsTabController();

  return (
    <div className="space-y-10 pt-4">
      <ReportFilterPanel
        onFiltersChange={handleFiltersChange}
        onGenerate={handleGenerateReport}
        isLoading={isLoading}
      />

      {isLoading && (
        <div
          className={`fixed inset-0 ${Z.max} flex items-center justify-center pointer-events-none`}
        >
          <div className="bg-token-surface-card px-10 py-6 rounded-sm border border-token-border-technical shadow-lg flex items-center gap-6 animate-in fade-in zoom-in-95">
            <LoadingSpinner size="md" variant="default" />
            <span className="text-[11px] font-black uppercase tracking-widest text-token-text-primary">
              Estructurando Reporte Analítico...
            </span>
          </div>
        </div>
      )}

      {reportData && (
        <div className="space-y-6 animate-in fade-in [animation-duration:100ms]">
          <div className="bg-token-surface-card px-8 py-6 rounded-sm border border-token-border-technical shadow-sm flex flex-col xl:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-6">
              <div
                className={`p-5 rounded-sm shadow-sm ${isSingleEmployeeReport ? "bg-token-surface-stripe text-token-text-primary border border-token-border-technical" : "bg-token-accent-brand text-white"}`}
              >
                {isSingleEmployeeReport ? (
                  <UsersIcon className="w-8 h-8" />
                ) : (
                  <TableCellsIcon className="w-8 h-8" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold text-token-text-primary uppercase tracking-tight leading-none">
                  {isSingleEmployeeReport ? "Resultados Individuales" : "Consolidado de Equipo"}
                </p>
                <div className="flex items-center gap-4">
                  <p className="text-[11px] font-semibold text-token-text-tertiary uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {sortedReportData.length} Registros Validados
                  </p>
                  <div className="h-4 w-px bg-token-border-subtle" />
                  <p className="text-[11px] font-semibold text-token-accent-brand uppercase tracking-wider">
                    Ventana: {filters.startDateISO} al {filters.endDateISO}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
              <div className="flex bg-token-surface-stripe p-1.5 rounded-sm border border-token-border-subtle shadow-sm items-center gap-1">
                <button
                  onClick={() => handleExport("xml")}
                  className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-token-text-secondary hover:text-orange-500 transition-colors flex items-center gap-2"
                >
                  <DocumentTextIcon className="h-4 w-4" /> XML
                </button>
                <div className="w-px h-6 bg-token-border-subtle mx-1" />
                <button
                  onClick={() => handleExport("pdf")}
                  className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-token-text-secondary hover:text-token-accent-brand transition-colors flex items-center gap-2"
                >
                  <PrinterIcon className="h-4 w-4" /> IMPRIMIR
                </button>
                <div className="w-px h-6 bg-token-border-subtle mx-1" />
                <div className="relative" ref={exportMenuRef}>
                  <button
                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                    className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-sm flex items-center gap-2 ${isExportMenuOpen ? "bg-token-accent-brand text-white" : "text-token-text-secondary hover:text-token-accent-brand"}`}
                  >
                    <ExportIcon className="h-4 w-4" /> EXPORTAR
                  </button>
                  {isExportMenuOpen && (
                    <div
                      className={`absolute right-0 mt-2 w-56 rounded-sm shadow-2xl bg-token-surface-card border border-token-border-technical ${Z.modal} p-2 animate-in fade-in slide-in-from-top-2`}
                    >
                      <button
                        onClick={() => handleExport("csv")}
                        className="flex items-center w-full p-4 text-[10px] font-black uppercase tracking-widest text-token-text-primary hover:bg-token-surface-active rounded-sm transition-colors"
                      >
                        <DocumentTextIcon className="w-4 h-4 mr-3 text-token-accent-brand" /> DATA
                        CSV
                      </button>
                      <button
                        onClick={() => handleExport("excel")}
                        className="flex items-center w-full p-4 text-[10px] font-black uppercase tracking-widest text-token-text-primary hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-sm transition-colors"
                      >
                        <TableCellsIcon className="w-4 h-4 mr-3 text-emerald-500" /> EXCEL BI
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleExport("server-pdf")}
                className="py-4 px-8 rounded-sm bg-rose-600 text-white font-black text-[11px] uppercase tracking-widest shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-3"
              >
                <DocumentArrowDownIcon className="h-5 w-5" /> DESCARGAR PDF
              </button>
            </div>
          </div>

          <div className="bg-token-surface-card rounded-sm border border-token-border-technical p-1 overflow-hidden">
            <ReportTable
              reportData={sortedReportData}
              isSingleEmployeeReport={isSingleEmployeeReport}
              sortConfig={sortConfig}
              requestSort={requestSort}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              justificationStyles={justificationStyles}
            />
          </div>
        </div>
      )}

      {/* Premium PDF Mode Modal */}
      <PdfExportModeModal
        isOpen={showPdfModeModal}
        onClose={() => setShowPdfModeModal(false)}
        onExportSummary={handleExportPdfSummary}
        onExportCompiled={handleExportPdfCompiled}
      />
    </div>
  );
};

export default ReportsTab;
