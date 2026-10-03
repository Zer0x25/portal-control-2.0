import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  DocumentArrowDownIcon,
  DocumentChartBarIcon,
  EyeIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  FunnelIcon,
  XCircleIcon,
} from "./icons/index";
import Button from "./Button";
import Input from "./Input";
import DatePickerDialog from "./DatePickerDialog";
import { ShiftReport } from "../../types/index";
import { useShiftReportsInfinite } from "../../hooks/queries/useShiftReportsInfinite";
import { useIntersectionObserver } from "../../hooks/useIntersectionObserver";
import { useRef, useEffect } from "react";

interface ClosedReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadPDF: (report: ShiftReport) => Promise<void>;
  onExportExcel: (report: ShiftReport) => Promise<void>;
  onPreview: (report: ShiftReport) => void;
}

import CinematicModal from "./CinematicModal";

const ClosedReportsModal: React.FC<ClosedReportsModalProps> = ({
  isOpen,
  onClose,
  onDownloadPDF,
  onExportExcel,
  onPreview,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useShiftReportsInfinite({
      pageSize: 20,
      status: "closed",
    });

  const reports = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) || [];
  }, [data]);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchesSearch =
        !searchTerm ||
        r.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.responsibleUser.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.shiftName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = !dateFilter || r.date.startsWith(dateFilter);
      return matchesSearch && matchesDate;
    });
  }, [reports, searchTerm, dateFilter]);

  const sentinelRef = useRef<HTMLTableRowElement>(null);
  const entry = useIntersectionObserver(sentinelRef, {
    root: null,
    rootMargin: "200px",
  });

  useEffect(() => {
    if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [entry?.isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const clearFilters = () => {
    setSearchTerm("");
    setDateFilter("");
  };

  return (
    <CinematicModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-4">
          <div className="bg-indigo-700/10 dark:bg-indigo-700/20 p-2.5 rounded-md border border-indigo-700/20">
            <DocumentChartBarIcon className="w-5 h-5 text-indigo-700 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-950 dark:text-white tracking-tight uppercase leading-none">
              Historial de Reportes
            </h3>
            <p className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-1 leading-none">
              Registro Histórico de Turnos
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-6xl"
    >
      <div className="flex flex-col gap-6 -m-2">
        {/* Filter Bar */}
        <div className="flex flex-wrap gap-4 items-center bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-800">
          <div className="flex-1 min-w-[280px] relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <FunnelIcon className="w-4 h-4" />
            </div>
            <Input
              placeholder="Buscar folio, responsable o turno..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12! bg-white! dark:bg-gray-800/50! rounded-md! h-12! border-gray-200! dark:border-gray-700! shadow-sm focus:ring-4! focus:ring-indigo-700/10! font-bold"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-700 transition-colors"
              >
                <XCircleIcon className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setIsDatePickerOpen(true)}
              className="flex items-center gap-3 px-5 h-12 bg-white dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700 hover:border-indigo-700/30 transition-all shadow-sm group"
            >
              <CalendarDaysIcon className="w-5 h-5 text-gray-400 group-hover:text-indigo-700" />
              <span
                className={`text-xs font-black uppercase tracking-widest ${dateFilter ? "text-gray-950 dark:text-white" : "text-gray-400"}`}
              >
                {dateFilter || "Filtrar Fecha"}
              </span>
            </button>
            <DatePickerDialog
              isOpen={isDatePickerOpen}
              onClose={() => setIsDatePickerOpen(false)}
              onSelect={(date) => setDateFilter(date)}
              initialDate={dateFilter}
            />
          </div>

          <Button
            variant="secondary"
            onClick={clearFilters}
            disabled={!searchTerm && !dateFilter}
            className="h-12 px-6 rounded-md flex items-center gap-2 bg-white! dark:bg-gray-800/50! border-gray-200 dark:border-gray-700 shadow-sm disabled:opacity-30 active:scale-95 transition-all"
          >
            <ArrowPathIcon
              className={`w-4 h-4 text-gray-400 ${searchTerm || dateFilter ? "animate-spin-slow" : ""}`}
            />
            <span className="text-[10px] font-black uppercase tracking-widest">Reset</span>
          </Button>
        </div>

        {/* Table Content */}
        <div className="relative overflow-hidden rounded-md bg-[#fdfbf7] dark:bg-gray-950 border border-gray-300 dark:border-gray-800 shadow-sm">
          <div className="overflow-x-auto custom-scrollbar max-h-[55vh]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                  <th className="px-6 py-5 sticky top-0 bg-inherit backdrop-blur-md z-10">
                    Folio / Fecha
                  </th>
                  <th className="px-6 py-5 sticky top-0 bg-inherit backdrop-blur-md z-10">
                    Estado Turno
                  </th>
                  <th className="px-6 py-5 sticky top-0 bg-inherit backdrop-blur-md z-10">
                    Gestión Responsable
                  </th>
                  <th className="px-6 py-5 text-right sticky top-0 bg-inherit backdrop-blur-md z-10">
                    Operaciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-20">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <div className="w-10 h-10 border-4 border-indigo-700/20 border-t-indigo-700 rounded-full animate-spin" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">
                          Consultando Registros...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-20">
                      <div className="flex flex-col items-center justify-center gap-4 opacity-40">
                        <div className="p-5 bg-gray-50 dark:bg-gray-900 rounded-md">
                          <DocumentArrowDownIcon className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-sm font-black text-gray-400 uppercase tracking-widest">
                          Sin resultados disponibles
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report, index) => (
                    <motion.tr
                      key={report.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      onDoubleClick={() => onPreview(report)}
                      className="group hover:bg-indigo-700/3 dark:hover:bg-indigo-700/6 transition-all cursor-pointer"
                    >
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-indigo-700 dark:text-indigo-400 font-mono tracking-tighter">
                            #{report.folio}
                          </span>
                          <span className="text-[10px] font-bold uppercase text-gray-400 mt-0.5">
                            {report.date}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-gray-800 dark:text-white uppercase">
                            {report.shiftName}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                            {report.startTime} <span className="text-gray-300">→</span>{" "}
                            {report.endTime || "Activo"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-black text-[10px] text-gray-500 border border-gray-200 dark:border-gray-700">
                            {report.responsibleUser.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase">
                            {report.responsibleUser}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => onPreview(report)}
                            className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-indigo-700 hover:border-indigo-700/30 shadow-sm transition-all active:scale-95"
                            title="Ver Detalle"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDownloadPDF(report)}
                            className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-rose-600 hover:border-rose-600/30 shadow-sm transition-all active:scale-95"
                            title="Descargar PDF"
                          >
                            <DocumentArrowDownIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onExportExcel(report)}
                            className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-emerald-600 hover:border-emerald-600/30 shadow-sm transition-all active:scale-95"
                            title="Exportar Excel"
                          >
                            <DocumentChartBarIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
                <tr ref={sentinelRef}>
                  <td colSpan={4} className="h-4">
                    {isFetchingNextPage && (
                      <div className="flex justify-center p-4">
                        <div className="w-6 h-6 border-2 border-indigo-700/20 border-t-indigo-700 rounded-full animate-spin" />
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Summary */}
        <div className="flex items-center justify-between px-2 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">
          <div className="flex items-center gap-4">
            <span>Resultados: {filteredReports.length}</span>
            <div className="w-1 h-1 rounded-full bg-gray-300" />
            <span>Total Cargados: {reports.length}</span>
          </div>
          <div className="flex items-center gap-1.5 text-indigo-700/60">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-700" />
            <span>Sincronizado</span>
          </div>
        </div>
      </div>
    </CinematicModal>
  );
};

export default ClosedReportsModal;
