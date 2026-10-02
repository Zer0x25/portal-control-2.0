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
import { motion, AnimatePresence } from "framer-motion";
import { useReportsTabController } from "../hooks/useReportsTabController";

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
        <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-950 px-10 py-6 rounded-sm border border-token-border-technical shadow-lg flex items-center gap-6"
          >
            <div className="w-10 h-10 border-4 border-sap-blue/20 border-t-sap-blue rounded-full animate-spin" />
            <span className="text-[11px] font-black uppercase tracking-widest text-token-text-primary">
              Estructurando Reporte Analítico...
            </span>
          </motion.div>
        </div>
      )}

      {reportData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.1 }}
          className="space-y-6"
        >
          <div className="bg-token-surface-card px-8 py-6 rounded-sm border border-token-border-technical shadow-sm flex flex-col xl:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-6">
              <div
                className={`p-5 rounded-sm shadow-sm ${isSingleEmployeeReport ? "bg-slate-900 text-white" : "bg-sap-blue text-white"}`}
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
                  <div className="h-4 w-[1px] bg-token-border-subtle" />
                  <p className="text-[11px] font-semibold text-sap-blue uppercase tracking-wider">
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
                  className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-token-text-secondary hover:text-sap-blue transition-colors flex items-center gap-2"
                >
                  <PrinterIcon className="h-4 w-4" /> IMPRIMIR
                </button>
                <div className="w-px h-6 bg-token-border-subtle mx-1" />
                <div className="relative" ref={exportMenuRef}>
                  <button
                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                    className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-sm flex items-center gap-2 ${isExportMenuOpen ? "bg-sap-blue text-white" : "text-token-text-secondary hover:text-sap-blue"}`}
                  >
                    <ExportIcon className="h-4 w-4" /> EXPORTAR
                  </button>
                  <AnimatePresence>
                    {isExportMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 4 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-56 rounded-sm shadow-2xl bg-token-surface-card border border-token-border-technical z-[150] p-2"
                      >
                        <button
                          onClick={() => handleExport("csv")}
                          className="flex items-center w-full p-4 text-[10px] font-black uppercase tracking-widest text-token-text-primary hover:bg-token-surface-active rounded-sm transition-all"
                        >
                          <DocumentTextIcon className="w-4 h-4 mr-3 text-sap-blue" /> DATA CSV
                        </button>
                        <button
                          onClick={() => handleExport("excel")}
                          className="flex items-center w-full p-4 text-[10px] font-black uppercase tracking-widest text-token-text-primary hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-sm transition-all"
                        >
                          <TableCellsIcon className="w-4 h-4 mr-3 text-emerald-500" /> EXCEL BI
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
        </motion.div>
      )}

      {/* Premium PDF Mode Modal */}
      <AnimatePresence>
        {showPdfModeModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPdfModeModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-token-surface-card rounded-sm shadow-2xl max-w-xl w-full p-12 border border-token-border-technical"
            >
              <div className="space-y-10">
                <div className="text-center">
                  <h3 className="text-3xl font-black text-token-text-primary uppercase tracking-tight leading-loose mb-2">
                    Arquitectura Documental
                  </h3>
                  <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-widest opacity-70">
                    SELECCIONE EL FORMATO DE COMPILACIÓN
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <button
                    onClick={async () => {
                      await handleExportPdfSummary();
                    }}
                    className="flex items-center p-8 rounded-sm bg-token-surface-stripe border border-token-border-subtle transition-all duration-300 hover:border-sap-blue hover:shadow-xl group text-left"
                  >
                    <div className="bg-sap-blue/10 p-4 rounded-sm mr-6 text-sap-blue group-hover:bg-sap-blue group-hover:text-white transition-all">
                      <TableCellsIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-black text-lg text-token-text-primary uppercase tracking-tight">
                        Resumen Analítico
                      </div>
                      <div className="text-[9px] font-bold text-sap-blue mt-1 uppercase tracking-widest">
                        MATRIZ TÉCNICA COMPARATIVA DE EQUIPO
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={async () => {
                      await handleExportPdfCompiled();
                    }}
                    className="flex items-center p-8 rounded-sm bg-token-surface-stripe border border-token-border-subtle transition-all duration-300 hover:border-emerald-500 hover:shadow-xl group text-left"
                  >
                    <div className="bg-emerald-500/10 p-4 rounded-sm mr-6 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                      <DocumentArrowDownIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-black text-lg text-token-text-primary uppercase tracking-tight">
                        Expedientes Totales
                      </div>
                      <div className="text-[9px] font-bold text-emerald-600 mt-1 uppercase tracking-widest">
                        FICHAS TÉCNICAS INDIVIDUALES COMPILADAS
                      </div>
                    </div>
                  </button>
                </div>

                <button
                  onClick={() => setShowPdfModeModal(false)}
                  className="w-full py-4 text-[10px] font-black text-token-text-tertiary hover:text-rose-500 transition-colors uppercase tracking-widest"
                >
                  [ CANCELAR OPERACIÓN ]
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReportsTab;
