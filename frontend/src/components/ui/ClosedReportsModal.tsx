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
            <h3 className="text-lg font-black text-token-text-primary tracking-tight uppercase leading-none">
              Historial de Reportes
            </h3>
            <p className="text-[9px] font-black text-token-text-secondary uppercase tracking-[0.2em] mt-1 leading-none">
              Registro Histórico de Turnos
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-6xl"
    >
      <div className="flex flex-col gap-6 -m-2">
        {/* Filter Bar */}
        <div className="flex flex-wrap gap-4 items-center bg-token-surface-stripe p-4 rounded-md border border-token-border-subtle">
          <div className="flex-1 min-w-[280px] relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-token-text-tertiary">
              <FunnelIcon className="w-4 h-4" />
            </div>
            <Input
              placeholder="Buscar folio, responsable o turno..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12! bg-token-surface-card! rounded-md! h-12! border-token-border-technical! shadow-sm focus:ring-4! focus:ring-token-border-focus/10! font-bold"
            />
            {searchTerm && (
              <Button
                variant="none"
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-token-text-tertiary hover:text-token-accent-brand transition-colors p-0 shadow-none"
              >
                <XCircleIcon className="w-5 h-5" />
              </Button>
            )}
          </div>

          <div className="relative">
            <Button
              variant="none"
              onClick={() => setIsDatePickerOpen(true)}
              className="flex items-center gap-3 px-5 h-12 bg-token-surface-card rounded-md border border-token-border-technical hover:border-token-border-focus transition-all shadow-sm group"
            >
              <CalendarDaysIcon className="w-5 h-5 text-token-text-tertiary group-hover:text-token-accent-brand" />
              <span
                className={`text-xs font-black uppercase tracking-widest ${dateFilter ? "text-token-text-primary" : "text-token-text-tertiary"}`}
              >
                {dateFilter || "Filtrar Fecha"}
              </span>
            </Button>
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
            className="h-12 px-6 rounded-md flex items-center gap-2 bg-token-surface-card! border-token-border-technical! shadow-sm disabled:opacity-30 active:scale-95 transition-all"
          >
            <ArrowPathIcon
              className={`w-4 h-4 text-token-text-tertiary ${searchTerm || dateFilter ? "animate-spin-slow" : ""}`}
            />
            <span className="text-[10px] font-black uppercase tracking-widest">Reset</span>
          </Button>
        </div>

        {/* Table Content */}
        <div className="relative overflow-hidden rounded-md bg-token-surface-card border border-token-border-technical shadow-sm">
          <div className="overflow-x-auto custom-scrollbar max-h-[55vh]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-black text-token-text-tertiary uppercase tracking-[0.2em] bg-token-surface-stripe border-b border-token-border-subtle">
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
              <tbody className="divide-y divide-token-border-subtle">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-20">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <div className="w-10 h-10 border-4 border-token-accent-brand/20 border-t-token-accent-brand rounded-full animate-spin" />
                        <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-widest animate-pulse">
                          Consultando Registros...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-20">
                      <div className="flex flex-col items-center justify-center gap-4 opacity-40">
                        <div className="p-5 bg-token-surface-stripe rounded-md">
                          <DocumentArrowDownIcon className="w-10 h-10 text-token-text-tertiary" />
                        </div>
                        <p className="text-sm font-black text-token-text-tertiary uppercase tracking-widest">
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
                      className="group hover:bg-token-surface-hover transition-all cursor-pointer"
                    >
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-token-accent-brand font-mono tracking-tighter">
                            #{report.folio}
                          </span>
                          <span className="text-[10px] font-bold uppercase text-token-text-tertiary mt-0.5">
                            {report.date}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-token-text-primary uppercase">
                            {report.shiftName}
                          </span>
                          <span className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-widest mt-0.5">
                            {report.startTime}{" "}
                            <span className="text-token-text-tertiary/60">→</span>{" "}
                            {report.endTime || "Activo"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-token-surface-technical flex items-center justify-center font-black text-[10px] text-token-text-secondary border border-token-border-subtle">
                            {report.responsibleUser.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-black text-token-text-primary uppercase">
                            {report.responsibleUser}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="none"
                            onClick={() => onPreview(report)}
                            className="p-3 bg-token-surface-card rounded-md border border-token-border-technical text-token-text-tertiary hover:text-token-accent-brand hover:border-token-border-focus shadow-sm transition-all active:scale-95"
                            title="Ver Detalle"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="none"
                            onClick={() => onDownloadPDF(report)}
                            className="p-3 bg-token-surface-card rounded-md border border-token-border-technical text-token-text-tertiary hover:text-token-status-error hover:border-token-status-error/30 shadow-sm transition-all active:scale-95"
                            title="Descargar PDF"
                          >
                            <DocumentArrowDownIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="none"
                            onClick={() => onExportExcel(report)}
                            className="p-3 bg-token-surface-card rounded-md border border-token-border-technical text-token-text-tertiary hover:text-token-status-success hover:border-token-status-success/30 shadow-sm transition-all active:scale-95"
                            title="Exportar Excel"
                          >
                            <DocumentChartBarIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
                <tr ref={sentinelRef}>
                  <td colSpan={4} className="h-4">
                    {isFetchingNextPage && (
                      <div className="flex justify-center p-4">
                        <div className="w-6 h-6 border-2 border-token-accent-brand/20 border-t-token-accent-brand rounded-full animate-spin" />
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Summary */}
        <div className="flex items-center justify-between px-2 text-[9px] font-black text-token-text-tertiary uppercase tracking-[0.2em]">
          <div className="flex items-center gap-4">
            <span>Resultados: {filteredReports.length}</span>
            <div className="w-1 h-1 rounded-full bg-token-border-technical" />
            <span>Total Cargados: {reports.length}</span>
          </div>
          <div className="flex items-center gap-1.5 text-token-accent-brand/60">
            <div className="w-1.5 h-1.5 rounded-full bg-token-accent-brand" />
            <span>Sincronizado</span>
          </div>
        </div>
      </div>
    </CinematicModal>
  );
};

export default ClosedReportsModal;
