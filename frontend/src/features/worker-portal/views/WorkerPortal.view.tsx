/* UI-PROTECTED: EDIT ONLY WITH HUMAN APPROVAL
   Presentational layer for WorkerPortal page. Receives all data/handlers
   from `WorkerPortal.container.tsx` and renders UI only.
*/

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  DailyTimeRecord,
  AugmentedTimeRecord,
  TimeRecordField,
  ClockingStatus,
  CorrectionRequest,
  Employee,
  User,
} from "../../../types/index";
import PageHeader from "../../../components/ui/PageHeader";
import LiveStatus from "../../../components/ui/LiveStatus";
import ServerClock from "../../../components/ui/ServerClock";
import IconBox from "../../../components/ui/IconBox";
import {
  DocumentArrowDownIcon,
  CalendarDaysIcon,
  UserIcon,
} from "../../../components/ui/icons/index";
import { CorrectionRequestModal } from "..";
import { formatBusinessDate } from "../../../utils/dateUtils";

export interface WorkerPortalViewProps {
  currentUser?: User | null;
  employee?: Employee | null;
  isLoadingEmployees?: boolean;
  isLoadingSchedulingData?: boolean;
  modalState: { isOpen: boolean; record: DailyTimeRecord | null; field: TimeRecordField | null };
  setModalState: (s: {
    isOpen: boolean;
    record: DailyTimeRecord | null;
    field: TimeRecordField | null;
  }) => void;
  selectedMonth: string;
  setSelectedMonth: (s: string) => void;
  isMobile: boolean;
  monthOptions: Array<{ value: string; label: string }>;
  enrichedRecords: AugmentedTimeRecord[];
  status: ClockingStatus;
  requestsMap: Map<string, CorrectionRequest>;
  handleExportPDF: () => Promise<void> | void;
  handleClockingAction: (
    t: "jornada_inicio" | "colacion_inicio" | "colacion_fin" | "jornada_fin",
  ) => Promise<void> | void;
  openCorrectionModal: (r: AugmentedTimeRecord, f: TimeRecordField) => void;
  formatDisplayDateTime?: (d: string | number | Date | undefined | null) => string;
  formatDecimalHoursToHHMM?: (h: number) => string;
}

const WorkerPortalView: React.FC<React.PropsWithChildren<WorkerPortalViewProps>> = (props) => {
  const {
    currentUser,
    employee,
    isLoadingEmployees,
    modalState,
    setModalState,
    selectedMonth,
    setSelectedMonth,
    isMobile,
    monthOptions,
    enrichedRecords,
    status,
    requestsMap,
    handleExportPDF,
    handleClockingAction,
    openCorrectionModal,
    formatDisplayDateTime = (d: string | number | Date | undefined | null) => String(d),
    formatDecimalHoursToHHMM = (n: number) => String(n),
  } = props;

  const statusLabels: Record<ClockingStatus, string> = {
    fuera: "Fuera de Jornada",
    en_jornada: "En Jornada",
    en_jornada_post_colacion: "En Jornada (Post-Colación)",
    en_colacion: "En Colación",
    terminada: "Jornada Terminada",
    jornada_terminada_anomalia: "Jornada Cerrada (Anomalía)",
    por_iniciar: "Por Iniciar",
    no_programado: "No Programado",
    ausente: "Ausente",
  };

  const formatRecordDate = (dateStr: string, options: Intl.DateTimeFormatOptions): string =>
    formatBusinessDate(dateStr, options);
  const quickMonthOptions = useMemo(() => monthOptions.slice(0, 3), [monthOptions]);
  const clockingActions = useMemo(
    () => [
      {
        id: "jornada_inicio",
        label: "Inicio Jornada",
        color: "green",
        statusGroup: ["fuera", "terminada", "jornada_terminada_anomalia"] as ClockingStatus[],
        action: () => handleClockingAction("jornada_inicio"),
      },
      {
        id: "colacion_inicio",
        label: "Inicio Colación",
        color: "yellow",
        statusGroup: ["en_jornada"] as ClockingStatus[],
        action: () => handleClockingAction("colacion_inicio"),
      },
      {
        id: "colacion_fin",
        label: "Fin Colación",
        color: "blue",
        statusGroup: ["en_colacion"] as ClockingStatus[],
        action: () => handleClockingAction("colacion_fin"),
      },
      {
        id: "jornada_fin",
        label: "Fin Jornada",
        color: "red",
        statusGroup: ["en_jornada", "en_jornada_post_colacion", "en_colacion"] as ClockingStatus[],
        action: () => handleClockingAction("jornada_fin"),
      },
    ],
    [handleClockingAction],
  );

  const renderTimestampCell = (
    record: AugmentedTimeRecord,
    field: TimeRecordField,
    label: string,
  ) => {
    const value = record[field] as string | number | Date | undefined | null;
    const existingRequest = requestsMap.get(`${record.id}-${field}`);
    const requestStatus = existingRequest?.status;
    const isPendingCorrection = requestStatus === "pending";
    const cellKey = `${record.id}-${field}`;

    return (
      <div key={cellKey} className="flex flex-col group/cell">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black text-token-text-tertiary uppercase tracking-tighter shrink-0">
            {label}:
          </span>
          <span className="text-[10px] font-black font-mono text-token-text-primary">
            {(formatDisplayDateTime && formatDisplayDateTime(value)).split(" ")[1] || "--:--"}
          </span>
        </div>
        <button
          onClick={() => openCorrectionModal(record, field)}
          disabled={isPendingCorrection}
          className="text-[8px] font-black text-sap-blue uppercase tracking-widest opacity-0 group-hover/cell:opacity-100 transition-opacity mt-0.5 text-left disabled:text-token-text-tertiary disabled:cursor-not-allowed"
        >
          {isPendingCorrection ? `[ ${requestStatus} ]` : "[ Corregir ]"}
        </button>
      </div>
    );
  };

  if (!currentUser || (isLoadingEmployees && !!employee)) {
    return (
      <div className="p-6 text-center text-token-text-primary">
        Cargando portal del trabajador...
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6 text-center text-red-500">
        <h1 className="text-2xl font-bold">Error de Configuración de Cuenta</h1>
        <p className="mt-2">
          Su cuenta de usuario no está vinculada a un registro de empleado. Por favor, contacte a un
          administrador.
        </p>
      </div>
    );
  }

  return (
    <div data-ui-protected className="space-y-8 pb-10">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6"
      >
        <PageHeader
          eyebrow="Portal"
          eyebrowIcon={<UserIcon className="w-3 h-3" />}
          icon={<UserIcon className="w-8 h-8 text-white" />}
          title="Portal del Trabajador"
          subtitle="Gestión personal y control de asistencia"
          actions={
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <LiveStatus label="PORTAL LIVE" status="online" className="hidden sm:flex" />
              <ServerClock
                containerClassName="text-right"
                dateClassName="font-black text-[9px] text-token-text-tertiary uppercase tracking-[0.2em] mb-1 italic"
                timeClassName="font-black text-2xl text-token-text-primary leading-none tabular-nums font-mono italic tracking-tighter"
              />
            </div>
          }
        />
      </motion.div>

      <div className="relative overflow-hidden p-8 rounded-[3rem] bg-token-surface-card border border-token-border-technical backdrop-blur-xl profile-card-glass">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-sap-blue/20 rounded-2xl blur-2xl group-hover:bg-sap-blue/40 transition-all scale-125" />
              <IconBox
                icon={<UserIcon />}
                variant="primary"
                size="lg"
                className="relative rounded-2xl border-2 border-white/10 w-20 h-20"
              />
            </div>
            <div>
              <p className="text-[10px] font-black text-sap-blue uppercase tracking-[0.4em] mb-1">
                Identidad Digital
              </p>
              <h2 className="text-3xl font-black text-token-text-primary uppercase italic tracking-tighter">
                {employee?.name}
              </h2>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-token-surface-stripe border border-token-border-subtle text-[9px] font-black text-token-text-tertiary uppercase tracking-widest">
                  <div
                    className={`w-2 h-2 rounded-full ${status === "fuera" ? "bg-token-text-tertiary" : "bg-emerald-500 animate-pulse"}`}
                  />
                  {statusLabels[status]}
                </div>
                <span className="text-[9px] font-black text-token-text-tertiary uppercase tracking-widest italic">
                  # {employee?.id.slice(-8).toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="text-right">
              <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-widest">
                Contrato Vigente
              </p>
              <p className="text-sm font-black text-token-text-primary uppercase italic mt-1">
                {employee?.workdayType}
              </p>
            </div>
          </div>
        </div>
        <div className="absolute top-[-50%] right-[-10%] w-64 h-64 bg-sap-blue/10 rounded-full blur-[100px] pointer-events-none" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12">
          <div className="flex items-center gap-3 mb-4 px-2">
            <h2 className="text-[10px] font-black text-token-text-tertiary uppercase tracking-[0.3em]">
              Gestión de Jornada en Tiempo Real
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {clockingActions.map((item) => {
              const isDisabled = !item.statusGroup.includes(status);
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  disabled={isDisabled}
                  className={`h-24 rounded-2xl border transition-all relative overflow-hidden group flex flex-col items-center justify-center gap-2 ${isDisabled ? "bg-token-surface-card border-token-border-subtle opacity-40 grayscale cursor-not-allowed text-token-text-tertiary" : item.color === "green" ? "bg-green-500/5 border-green-500/20 text-green-800 dark:text-green-600" : item.color === "yellow" ? "bg-yellow-500/5 border-yellow-500/20 text-yellow-800 dark:text-yellow-600" : item.color === "blue" ? "bg-blue-500/5 border-blue-500/20 text-blue-800 dark:text-blue-600" : "bg-red-500/5 border-red-500/20 text-red-800 dark:text-red-600"}`}
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] relative z-10">
                    {item.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-token-surface-card backdrop-blur-xl rounded-[2.5rem] border border-token-border-technical shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-token-border-subtle flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <IconBox icon={<CalendarDaysIcon />} variant="primary" size="md" />
            <div>
              <h3 className="text-sm font-black text-token-text-primary uppercase italic">
                Historial de Marcajes
              </h3>
              <p className="text-[9px] font-black text-token-text-tertiary uppercase tracking-widest mt-0.5">
                Control de registros y asistencias
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-token-surface-header p-1 rounded-xl border border-token-border-subtle">
              {quickMonthOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedMonth(opt.value)}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedMonth === opt.value ? "bg-token-surface-active text-token-text-primary" : "text-token-text-tertiary hover:text-token-text-secondary"}`}
                >
                  {opt.label.split(" ")[0]}
                </button>
              ))}
            </div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="Seleccionar mes del calendario"
              className="h-10 px-4 bg-token-surface-card border border-token-border-technical rounded-xl text-[10px] font-black uppercase text-token-text-secondary outline-none focus:border-sap-blue/50"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => handleExportPDF && handleExportPDF()}
              className="h-10 px-6 bg-sap-blue hover:brightness-110 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all flex items-center gap-2"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              Descargar PDF
            </button>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-premium" tabIndex={0}>
          {isMobile ? (
            <div className="space-y-6 p-6">
              {enrichedRecords.length > 0 ? (
                enrichedRecords.map((record) => (
                  <div
                    key={record.id}
                    className={`p-6 rounded-2xl border backdrop-blur-xl bg-token-surface-card border-token-border-subtle shadow-sm group`}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <p className="text-lg font-black text-token-text-primary uppercase italic tracking-tighter">
                          {formatRecordDate(record.date, {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </p>
                        <p className="text-[9px] font-black text-token-text-tertiary uppercase tracking-[0.2em] mt-0.5">
                          {formatRecordDate(record.date, {
                            weekday: "long",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-token-text-tertiary uppercase tracking-widest">
                            Turno
                          </p>
                          <p className="text-[10px] font-black text-token-text-secondary uppercase tracking-tight">
                            {record.scheduleInfo?.scheduleText || "N/A"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-token-text-tertiary uppercase tracking-widest">
                            Trabajado
                          </p>
                          <p className="text-[10px] font-black text-sap-blue font-mono italic tracking-tighter">
                            {formatDecimalHoursToHHMM &&
                              formatDecimalHoursToHHMM(record.workedHours)}{" "}
                            hrs
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-token-border-subtle">
                        <p className="text-[9px] font-black text-token-text-tertiary uppercase tracking-widest mb-3">
                          Marcajes y Correcciones
                        </p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                          {renderTimestampCell(record, "entrada", "IN")}
                          {renderTimestampCell(record, "inicioColacion", "L1")}
                          {renderTimestampCell(record, "finColacion", "L2")}
                          {renderTimestampCell(record, "salida", "OUT")}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center">
                  <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-[0.5em]">
                    Sin actividad reciente
                  </p>
                </div>
              )}
            </div>
          ) : (
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="bg-token-surface-header backdrop-blur-md">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-token-text-secondary uppercase tracking-[0.2em] border-b border-token-border-subtle">
                    Fecha
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-token-text-secondary uppercase tracking-[0.2em] border-b border-token-border-subtle">
                    Turno
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-token-text-secondary uppercase tracking-[0.2em] border-b border-token-border-subtle">
                    Marcajes Progresivos
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-token-text-secondary uppercase tracking-[0.2em] border-b border-token-border-subtle">
                    P.
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-token-text-secondary uppercase tracking-[0.2em] border-b border-token-border-subtle">
                    T.
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-token-text-secondary uppercase tracking-[0.2em] border-b border-token-border-subtle text-right">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-token-border-subtle bg-token-surface-card">
                {enrichedRecords.length > 0 ? (
                  enrichedRecords.map((record) => (
                    <motion.tr
                      key={record.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`group hover:bg-token-surface-active transition-colors ${record.scheduleInfo?.justificationType || record.justification?.type ? "bg-sap-blue/5" : ""}`}
                    >
                      <td className="px-6 py-4 align-top">
                        <div className="text-sm font-black text-token-text-primary uppercase italic tracking-tighter">
                          {formatRecordDate(record.date, {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </div>
                        <div className="text-[9px] font-black text-token-text-tertiary uppercase tracking-widest mt-0.5">
                          {formatRecordDate(record.date, {
                            weekday: "short",
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <span className="text-[10px] font-black text-token-text-secondary uppercase tracking-tighter italic">
                          {record.scheduleInfo?.scheduleText || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 max-w-xs">
                          {renderTimestampCell(record, "entrada", "IN")}
                          {renderTimestampCell(record, "inicioColacion", "L1")}
                          {renderTimestampCell(record, "finColacion", "L2")}
                          {renderTimestampCell(record, "salida", "OUT")}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top text-xs font-black font-mono text-token-text-tertiary italic">
                        {formatDecimalHoursToHHMM &&
                          formatDecimalHoursToHHMM(record.scheduledHours ?? 0)}
                      </td>
                      <td className="px-6 py-4 align-top text-xs font-black font-mono text-sap-blue italic">
                        {formatDecimalHoursToHHMM && formatDecimalHoursToHHMM(record.workedHours)}
                      </td>
                      <td className={`px-6 py-4 align-top text-right`}>
                        <div
                          className={`text-sm font-black font-mono italic tracking-tighter ${(record.overtimeHours ?? 0) >= 0 ? "text-emerald-600" : "text-sap-error"}`}
                        >
                          {formatDecimalHoursToHHMM &&
                            formatDecimalHoursToHHMM(record.overtimeHours)}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-12 text-[10px] font-black text-token-text-tertiary uppercase tracking-[0.3em]"
                    >
                      Sin registros para este período
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalState.isOpen && modalState.record && modalState.field && (
        <CorrectionRequestModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ isOpen: false, record: null, field: null })}
          record={modalState.record}
          field={modalState.field}
        />
      )}
    </div>
  );
};

export default React.memo(WorkerPortalView);
