import React, { useCallback } from "react";
import { ShiftReport } from "../../types/index";
import { useUsers } from "../../hooks/useUsers";
import { useEmployees } from "../../hooks/useEmployees";
import { exportShiftReportToPDF } from "../../utils/export/index";
import {
  PrinterIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  UserIcon,
  ClockIcon,
} from "./icons/index";
import CinematicModal from "./CinematicModal";

const parseDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  let date = new Date(dateString);
  if (!isNaN(date.getTime())) return date;
  const parts = dateString.split(/[-/]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
  }
  return null;
};

interface ShiftReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ShiftReport | null;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  canNavigatePrev?: boolean;
  canNavigateNext?: boolean;
}

const ShiftReportModal: React.FC<ShiftReportModalProps> = ({
  isOpen,
  onClose,
  report,
  onNavigatePrev,
  onNavigateNext,
  canNavigatePrev,
  canNavigateNext,
}) => {
  const { users } = useUsers();
  const { getEmployeeById } = useEmployees();

  const getResponsibleDisplayName = useCallback(
    (username: string): string => {
      const user = users.find((u) => u.username === username);
      if (user?.employeeId) {
        const employee = getEmployeeById(user.employeeId);
        return employee?.name || username;
      }
      return username;
    },
    [users, getEmployeeById],
  );

  if (!report) return null;

  const responsibleDisplayName = getResponsibleDisplayName(report.responsibleUser);

  const handleExport = () => {
    exportShiftReportToPDF(report, responsibleDisplayName);
  };

  return (
    <CinematicModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="bg-sap-blue/10 p-2 rounded-sm text-sap-blue border border-sap-blue/20">
            <DocumentTextIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-token-text-primary tracking-tight uppercase leading-none">
              Reporte de Turno #{report.folio}
            </h3>
            <p className="text-[8px] font-bold text-token-text-tertiary uppercase tracking-[0.2em] mt-1.5 leading-none">
              Resumen de Bitácora Digital
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center bg-token-surface-stripe p-3 rounded-md border border-token-border-subtle">
          <div className="flex gap-1.5">
            <button
              onClick={onNavigatePrev}
              disabled={!canNavigatePrev}
              className="rounded-sm h-8 w-8 flex items-center justify-center disabled:opacity-30 border border-token-border-subtle bg-token-surface-card hover:bg-token-surface-active transition-colors active:scale-95"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onNavigateNext}
              disabled={!canNavigateNext}
              className="rounded-sm h-8 w-8 flex items-center justify-center disabled:opacity-30 border border-token-border-subtle bg-token-surface-card hover:bg-token-surface-active transition-colors active:scale-95"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleExport}
            className="rounded-sm flex items-center gap-2 px-4 h-8 bg-sap-blue hover:bg-sap-blue/90 text-white text-[9px] font-bold uppercase tracking-widest shadow-sm active:scale-95 transition-all"
          >
            <PrinterIcon className="w-3.5 h-3.5" />
            Imprimir Reporte
          </button>
        </div>

        {/* Info Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-token-surface-stripe border border-token-border-subtle p-4 rounded-md relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-sap-blue opacity-30" />
            <h4 className="text-[8px] font-bold text-sap-blue uppercase tracking-[0.2em] mb-3">
              Datos Generales
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <CalendarDaysIcon className="w-3.5 h-3.5 text-token-text-tertiary" />
                <span className="text-xs font-bold text-token-text-primary capitalize">
                  {(() => {
                    const dateObj = parseDate(report.date);
                    if (!dateObj) return report.date;
                    return dateObj.toLocaleDateString("es-CL", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    });
                  })()}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <UserIcon className="w-3.5 h-3.5 text-token-text-tertiary" />
                <span className="text-xs font-bold text-token-text-secondary">
                  {responsibleDisplayName}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <ClockIcon className="w-3.5 h-3.5 text-sap-blue/70" />
                <span className="text-xs font-bold text-sap-blue uppercase tracking-widest">
                  {report.shiftName}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-token-surface-card border border-token-border-subtle p-4 rounded-md relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-30" />
            <h4 className="text-[8px] font-bold text-emerald-600 uppercase tracking-[0.2em] mb-3">
              Tiempos de Turno
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-token-text-tertiary uppercase tracking-widest mb-0.5">
                  Apertura
                </span>
                <span className="text-lg font-mono font-bold text-token-text-primary leading-none">
                  {(() => {
                    const d = new Date(report.startTime);
                    return !isNaN(d.getTime())
                      ? d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
                      : report.startTime;
                  })()}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-token-text-tertiary uppercase tracking-widest mb-0.5">
                  Cierre
                </span>
                <span className="text-lg font-mono font-bold text-token-text-primary leading-none">
                  {report.endTime
                    ? (() => {
                        const d = new Date(report.endTime);
                        return !isNaN(d.getTime())
                          ? d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
                          : report.endTime;
                      })()
                    : "--:--"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Novedades Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 ml-1">
            <div className="w-1 h-3 bg-sap-blue opacity-50 rounded-full" />
            <h4 className="text-[9px] font-bold text-token-text-tertiary uppercase tracking-[0.3em]">
              Bitácora de Novedades ({report.logEntries.length})
            </h4>
          </div>
          <div className="space-y-2">
            {report.logEntries.length > 0 ? (
              report.logEntries.map((le) => (
                <div
                  key={le.id}
                  className="bg-token-surface-stripe border border-token-border-subtle p-3.5 rounded-md hover:border-sap-blue/20 transition-all group"
                >
                  <div className="flex gap-4">
                    <span className="text-[9px] font-mono font-bold text-sap-blue bg-sap-blue/5 px-2 py-1 rounded-sm h-fit border border-sap-blue/10">
                      {le.time}
                    </span>
                    <p className="text-xs text-token-text-primary font-medium leading-relaxed">
                      {le.annotation}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 rounded-md bg-token-surface-stripe border border-dashed border-token-border-subtle opacity-50">
                <p className="text-[9px] font-bold text-token-text-tertiary uppercase tracking-[0.2em]">
                  Sin registros
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Proveedores Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 ml-1">
            <div className="w-1 h-3 bg-emerald-600 opacity-50 rounded-full" />
            <h4 className="text-[9px] font-bold text-token-text-tertiary uppercase tracking-[0.3em]">
              Ingresos de Proveedores ({report.supplierEntries.length})
            </h4>
          </div>
          <div className="space-y-2 pb-2">
            {report.supplierEntries.length > 0 ? (
              report.supplierEntries.map((se) => (
                <div
                  key={se.id}
                  className="bg-token-surface-card border border-token-border-subtle p-3.5 rounded-md hover:border-emerald-600/20 transition-all"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest mb-1">
                        Hora
                      </span>
                      <span className="text-[10px] font-mono font-bold text-token-text-primary">
                        {se.time}
                      </span>
                    </div>
                    <div className="flex flex-col sm:col-span-2">
                      <span className="text-[8px] font-bold text-token-text-tertiary uppercase tracking-widest mb-0.5">
                        {se.company}
                      </span>
                      <span className="text-xs font-bold text-token-text-primary uppercase truncate leading-none">
                        {se.driverName}
                      </span>
                      <p className="text-[9px] font-medium text-token-text-tertiary mt-1.5 opacity-80">
                        PATENTE: {se.licensePlate} • PAX: {se.paxCount}
                      </p>
                    </div>
                    <div className="flex flex-col justify-center">
                      <p className="text-[10px] text-token-text-secondary font-medium leading-snug line-clamp-2">
                        {se.reason}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 rounded-md bg-token-surface-stripe border border-dashed border-token-border-subtle opacity-50">
                <p className="text-[9px] font-bold text-token-text-tertiary uppercase tracking-[0.2em]">
                  Sin ingresos
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </CinematicModal>
  );
};

export default ShiftReportModal;
