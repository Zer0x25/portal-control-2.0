/* UI-PROTECTED: EDIT ONLY WITH HUMAN APPROVAL
   Presentational layer for WorkerPortal page. Receives all data/handlers
   from `WorkerPortal.container.tsx` and renders UI only.
*/

import React from "react";
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
import Button from "../../../components/ui/Button";
import LiveStatus from "../../../components/ui/LiveStatus";
import ServerClock from "../../../components/ui/ServerClock";
import IconBox from "../../../components/ui/IconBox";
import Container from "../../../components/ui/Container";
import Card from "../../../components/ui/Card";
import {
  DocumentArrowDownIcon,
  CalendarDaysIcon,
  UserIcon,
} from "../../../components/ui/icons/index";
import { CorrectionRequestModal } from "..";
import { formatBusinessDate } from "../../../utils/dateUtils";
import {
  CORRECTION_REQUEST_STATUS_COLORS,
  CORRECTION_REQUEST_STATUS_TEXT,
} from "../../../utils/mappings";
import {
  getClockingActionButtonClassName,
  type ClockingActionType,
} from "../../../utils/clockingActionButtonStyles";
import { Z } from "../../../constants/zScale";

const CORRECTION_FIELD_TEXT: Record<TimeRecordField, string> = {
  entrada: "Entrada",
  inicioColacion: "Inicio de colación",
  finColacion: "Fin de colación",
  salida: "Salida",
};

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
  isClockingStatusUncertain?: boolean;
  isClockingStatusLoading?: boolean;
  isClockingStatusError?: boolean;
  retryClockingStatus?: () => Promise<void> | void;
  isPendingCorrectionsUncertain?: boolean;
  isPendingCorrectionsError?: boolean;
  retryPendingCorrectionRequests?: () => Promise<void> | void;
  requestsMap: Map<string, CorrectionRequest>;
  correctionRequests?: CorrectionRequest[];
  isLoadingCorrectionRequests?: boolean;
  isErrorCorrectionRequests?: boolean;
  isCorrectionRequestsNextPageError?: boolean;
  retryCorrectionRequests?: () => Promise<void> | void;
  hasMoreCorrectionRequests?: boolean;
  isFetchingMoreCorrectionRequests?: boolean;
  loadMoreCorrectionRequests?: () => Promise<void> | void;
  handleExportPDF: () => Promise<void> | void;
  handleClockingAction: (t: ClockingActionType) => Promise<void> | void;
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
    isClockingStatusUncertain = false,
    isClockingStatusLoading = false,
    isClockingStatusError = false,
    retryClockingStatus = () => undefined,
    isPendingCorrectionsUncertain = false,
    isPendingCorrectionsError = false,
    retryPendingCorrectionRequests = () => undefined,
    requestsMap,
    correctionRequests = [],
    isLoadingCorrectionRequests = false,
    isErrorCorrectionRequests = false,
    isCorrectionRequestsNextPageError = false,
    retryCorrectionRequests = () => undefined,
    hasMoreCorrectionRequests = false,
    isFetchingMoreCorrectionRequests = false,
    loadMoreCorrectionRequests = () => undefined,
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
  const formatCorrectionTimestamp = (timestamp?: number | null): string => {
    if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) return "—";
    return formatDisplayDateTime(new Date(timestamp).toISOString());
  };
  // Derivaciones puras de props: sin estado, sin efectos y sin hooks. La vista
  // es presentacional puro (spec 033 AC1); el compilador de React (spec 037)
  // se encarga de memoizar estas constantes.
  const quickMonthOptions = monthOptions.slice(0, 3);
  const clockingActions: Array<{
    id: ClockingActionType;
    label: string;
    statusGroup: ClockingStatus[];
    action: () => Promise<void> | void;
  }> = [
    {
      id: "jornada_inicio",
      label: "Inicio Jornada",
      statusGroup: ["fuera", "terminada", "jornada_terminada_anomalia"] as ClockingStatus[],
      action: () => handleClockingAction("jornada_inicio"),
    },
    {
      id: "colacion_inicio",
      label: "Inicio Colación",
      statusGroup: ["en_jornada"] as ClockingStatus[],
      action: () => handleClockingAction("colacion_inicio"),
    },
    {
      id: "colacion_fin",
      label: "Fin Colación",
      statusGroup: ["en_colacion"] as ClockingStatus[],
      action: () => handleClockingAction("colacion_fin"),
    },
    {
      id: "jornada_fin",
      label: "Fin Jornada",
      statusGroup: ["en_jornada", "en_jornada_post_colacion", "en_colacion"] as ClockingStatus[],
      action: () => handleClockingAction("jornada_fin"),
    },
  ];

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
      <div key={cellKey} className="group/cell min-w-0">
        <div className="flex min-w-0 items-baseline justify-between gap-2">
          <span className="typo-list-secondary truncate text-token-text-secondary">{label}:</span>
          <span
            data-list-role="value"
            className="typo-list-value whitespace-nowrap text-token-text-primary"
          >
            {(formatDisplayDateTime && formatDisplayDateTime(value)).split(" ")[1] || "--:--"}
          </span>
        </div>
        <button
          data-testid={`worker-correction-action-${record.id}-${field}`}
          onClick={() => openCorrectionModal(record, field)}
          disabled={isPendingCorrection || isPendingCorrectionsUncertain}
          className="mt-1 text-xs font-medium text-token-accent-brand opacity-100 transition-opacity focus:opacity-100 focus-visible:opacity-100 md:opacity-0 md:group-hover/cell:opacity-100 md:group-focus-within/cell:opacity-100 disabled:cursor-not-allowed disabled:text-token-text-tertiary"
        >
          {isPendingCorrection ? "Solicitud pendiente" : "Corregir"}
        </button>
      </div>
    );
  };

  if (!currentUser || (isLoadingEmployees && !employee)) {
    return (
      <div className="p-6 text-center text-token-text-primary">
        Cargando portal del trabajador...
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6 text-center text-token-status-error-text">
        <h1 className="text-2xl font-bold">Error de Configuración de Cuenta</h1>
        <p className="mt-2">
          Su cuenta de usuario no está vinculada a un registro de empleado. Por favor, contacte a un
          administrador.
        </p>
      </div>
    );
  }

  return (
    <Container noPadding data-ui-protected className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 animate-in fade-in">
        <PageHeader
          eyebrow="Portal"
          eyebrowIcon={<UserIcon className="w-3 h-3" />}
          icon={<UserIcon className="w-8 h-8 text-white" />}
          title="Portal del Trabajador"
          subtitle="Gestión personal y control de asistencia"
          actions={
            <div className="flex min-w-0 items-center gap-4 w-full sm:w-auto">
              <LiveStatus label="PORTAL LIVE" status="online" className="hidden sm:flex" />
              <ServerClock
                containerClassName="min-w-max shrink-0 text-right"
                dateClassName="mb-1 whitespace-nowrap text-xs font-semibold text-token-text-tertiary uppercase tracking-wide"
                timeClassName="whitespace-nowrap text-2xl font-semibold text-token-text-primary leading-tight tabular-nums font-mono"
              />
            </div>
          }
        />
      </div>

      <Card noPadding className="overflow-hidden">
        <div
          className={`relative ${Z.sticky} flex flex-col md:flex-row justify-between items-center gap-8 p-8`}
        >
          <div className="flex items-center gap-6">
            <div className="relative group">
              <IconBox
                icon={<UserIcon />}
                variant="primary"
                size="lg"
                className="relative border-2 border-white/10 w-20 h-20"
              />
            </div>
            <div>
              <p className="text-[10px] font-black text-token-accent-brand uppercase tracking-[0.4em] mb-1">
                Identidad Digital
              </p>
              <h2
                data-testid="worker-identity"
                className="text-3xl font-black text-token-text-primary uppercase tracking-tight"
              >
                {employee?.name}
              </h2>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-token-surface-stripe border border-token-border-subtle text-xxs font-black text-token-text-tertiary uppercase tracking-widest">
                  <div
                    className={`w-2 h-2 rounded-full ${status === "fuera" ? "bg-token-text-tertiary" : "bg-token-status-success animate-pulse"}`}
                  />
                  {isClockingStatusUncertain
                    ? isClockingStatusError
                      ? "Marcaje no disponible"
                      : "Consultando marcaje..."
                    : statusLabels[status]}
                </div>
                <span
                  data-testid="worker-identity-code"
                  className="text-xs font-medium text-token-text-tertiary uppercase tracking-wide"
                >
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
              <p className="text-sm font-semibold text-token-text-primary uppercase mt-1">
                {employee?.workdayType}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12">
          <div className="flex items-center gap-3 mb-4 px-2">
            <h2 className="text-[10px] font-black text-token-text-tertiary uppercase tracking-[0.3em]">
              Gestión de Jornada en Tiempo Real
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {clockingActions.map((item) => {
              const isDisabled = isClockingStatusUncertain || !item.statusGroup.includes(status);
              return (
                <Button
                  key={item.id}
                  data-testid={`worker-clock-action-${item.id}`}
                  variant="none"
                  size="none"
                  onClick={item.action}
                  disabled={isDisabled}
                  aria-label={item.label}
                  className={`w-full h-24 relative overflow-hidden group flex-col gap-2 transition-all ${getClockingActionButtonClassName(item.id, isDisabled)}`}
                >
                  <span
                    className={`text-[10px] font-black uppercase tracking-[0.2em] relative ${Z.sticky}`}
                  >
                    {item.label}
                  </span>
                </Button>
              );
            })}
          </div>
          {isClockingStatusUncertain && (
            <div
              className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-token-border-subtle bg-token-surface-stripe p-4 text-sm text-token-text-secondary"
              role={isClockingStatusError ? "alert" : "status"}
            >
              <p>
                {isClockingStatusError
                  ? "No se pudo consultar tu último marcaje."
                  : isClockingStatusLoading
                    ? "Consultando tu último marcaje; las acciones están temporalmente deshabilitadas."
                    : "Actualizando tu último marcaje; las acciones están temporalmente deshabilitadas."}
              </p>
              {isClockingStatusError && (
                <Button
                  data-testid="worker-clocking-status-retry"
                  variant="secondary"
                  size="sm"
                  onClick={retryClockingStatus}
                >
                  Reintentar marcaje
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="p-8 border-b border-token-border-subtle flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <IconBox icon={<CalendarDaysIcon />} variant="primary" size="md" />
            <div>
              <h3 className="typo-ui-title text-token-text-primary">Historial de marcajes</h3>
              <p className="typo-ui-meta text-token-text-secondary mt-1">
                Control de registros y asistencias
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="flex bg-token-surface-header p-1 rounded-md border border-token-border-subtle">
              {quickMonthOptions.map((opt) => (
                <button
                  key={opt.value}
                  data-testid={`worker-month-quick-${opt.value}`}
                  onClick={() => setSelectedMonth(opt.value)}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${selectedMonth === opt.value ? "bg-token-surface-active text-token-text-primary" : "text-token-text-tertiary hover:text-token-text-secondary"}`}
                >
                  {opt.label.split(" ")[0]}
                </button>
              ))}
            </div>
            <select
              data-testid="worker-month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="Seleccionar mes del calendario"
              className="h-10 px-4 bg-token-surface-card border border-token-border-technical rounded-md text-xs font-medium text-token-text-secondary outline-none focus:border-token-accent-brand/50"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              data-testid="worker-export-pdf"
              onClick={() => handleExportPDF && handleExportPDF()}
              className="h-10 shrink-0 whitespace-nowrap px-4 bg-token-accent-brand hover:brightness-110 text-token-text-onAccent rounded-md text-xs font-semibold shadow-sm transition-all flex items-center gap-2"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              Descargar PDF
            </button>
          </div>
        </div>

        <div
          className="overflow-x-auto scrollbar-premium"
          role="region"
          aria-label="Registros de trabajo"
          // Región scrollable accesible por teclado (WCAG 2.1): patrón
          // sancionado, no es un elemento interactivo.
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
        >
          {isMobile ? (
            <div className="space-y-6 p-6">
              {enrichedRecords.length > 0 ? (
                enrichedRecords.map((record) => (
                  <div
                    key={record.id}
                    className="p-6 rounded-md border bg-token-surface-card border-token-border-subtle shadow-sm group"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <p className="text-base font-semibold text-token-text-primary">
                          {formatRecordDate(record.date, {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </p>
                        <p className="text-xs font-medium text-token-text-tertiary mt-1">
                          {formatRecordDate(record.date, {
                            weekday: "long",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-token-text-tertiary">Turno</p>
                          <p className="text-sm font-medium text-token-text-primary">
                            {record.scheduleInfo?.scheduleText || "Sin turno asignado"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-token-text-tertiary">
                            Horas trabajadas
                          </p>
                          <p className="text-sm font-semibold text-token-accent-brand font-mono tabular-nums">
                            {formatDecimalHoursToHHMM &&
                              formatDecimalHoursToHHMM(record.workedHours)}{" "}
                            hrs
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-token-border-subtle">
                        <p className="text-sm font-semibold text-token-text-primary mb-3">
                          Marcajes y correcciones
                        </p>
                        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-x-6 gap-y-3">
                          {renderTimestampCell(record, "entrada", "Entrada")}
                          {renderTimestampCell(record, "inicioColacion", "Inicio colación")}
                          {renderTimestampCell(record, "finColacion", "Fin colación")}
                          {renderTimestampCell(record, "salida", "Salida")}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center">
                  <p className="text-sm text-token-text-secondary">Sin actividad reciente</p>
                </div>
              )}
            </div>
          ) : (
            <table
              data-list-group="data-table"
              className="w-full min-w-full md:min-w-[880px] border-separate border-spacing-0"
            >
              <thead className="bg-token-surface-header">
                <tr>
                  <th className="whitespace-nowrap px-3 py-3 text-left typo-list-header text-token-text-secondary border-b border-token-border-subtle">
                    Fecha
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-left typo-list-header text-token-text-secondary border-b border-token-border-subtle">
                    Turno
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-left typo-list-header text-token-text-secondary border-b border-token-border-subtle">
                    Marcajes
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-left typo-list-header text-token-text-secondary border-b border-token-border-subtle">
                    Horas planificadas
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-left typo-list-header text-token-text-secondary border-b border-token-border-subtle">
                    Horas trabajadas
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-right typo-list-header text-token-text-secondary border-b border-token-border-subtle">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-token-border-subtle bg-token-surface-card">
                {enrichedRecords.length > 0 ? (
                  enrichedRecords.map((record) => (
                    <tr
                      key={record.id}
                      className={`group hover:bg-token-surface-active transition-colors animate-in fade-in ${record.scheduleInfo?.justificationType || record.justification?.type ? "bg-token-accent-brand/5" : ""}`}
                    >
                      <td className="px-3 py-4 align-top">
                        <div
                          data-list-role="value"
                          className="typo-list-value text-token-text-primary"
                        >
                          {formatRecordDate(record.date, {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </div>
                        <div className="typo-list-secondary text-token-text-tertiary mt-1">
                          {formatRecordDate(record.date, {
                            weekday: "short",
                          })}
                        </div>
                      </td>
                      <td className="px-3 py-4 align-top">
                        <span
                          data-list-role="primary"
                          className="typo-list-primary text-token-text-primary"
                        >
                          {record.scheduleInfo?.scheduleText || "Sin turno asignado"}
                        </span>
                      </td>
                      <td className="px-3 py-4 align-top">
                        <div className="grid w-[20rem] max-w-full grid-cols-2 gap-x-3 gap-y-2">
                          {renderTimestampCell(record, "entrada", "Entrada")}
                          {renderTimestampCell(record, "inicioColacion", "Inicio colación")}
                          {renderTimestampCell(record, "finColacion", "Fin colación")}
                          {renderTimestampCell(record, "salida", "Salida")}
                        </div>
                      </td>
                      <td
                        data-list-role="value"
                        className="px-3 py-4 align-top typo-list-value text-token-text-secondary"
                      >
                        {formatDecimalHoursToHHMM &&
                          formatDecimalHoursToHHMM(record.scheduledHours ?? 0)}
                      </td>
                      <td
                        data-list-role="value"
                        className="px-3 py-4 align-top typo-list-value text-token-text-primary"
                      >
                        {formatDecimalHoursToHHMM && formatDecimalHoursToHHMM(record.workedHours)}
                      </td>
                      <td className="px-3 py-4 align-top text-right">
                        <div
                          data-list-role="value"
                          className={`typo-list-value ${(record.overtimeHours ?? 0) >= 0 ? "text-token-status-success-text" : "text-token-status-error-text"}`}
                        >
                          {formatDecimalHoursToHHMM &&
                            formatDecimalHoursToHHMM(record.overtimeHours)}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-sm text-token-text-secondary">
                      No hay registros para este período
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {isPendingCorrectionsUncertain && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-token-border-subtle bg-token-surface-stripe p-4 text-sm text-token-text-secondary"
          role={isPendingCorrectionsError ? "alert" : "status"}
        >
          <p>
            {isPendingCorrectionsError
              ? "No se pudieron consultar todas tus solicitudes pendientes. Las correcciones están temporalmente deshabilitadas."
              : "Verificando tus solicitudes pendientes; las correcciones están temporalmente deshabilitadas."}
          </p>
          {isPendingCorrectionsError && (
            <Button
              data-testid="worker-pending-corrections-retry"
              variant="secondary"
              size="sm"
              onClick={retryPendingCorrectionRequests}
            >
              Reintentar solicitudes
            </Button>
          )}
        </div>
      )}

      <Card noPadding className="overflow-hidden">
        <div className="border-b border-token-border-subtle p-6">
          <h3 className="typo-ui-title text-token-text-primary">
            Historial de solicitudes de corrección
          </h3>
          <p className="typo-ui-meta mt-1 text-token-text-secondary">
            Revisa la fecha, el estado y la resolución de tus solicitudes.
          </p>
        </div>
        {isLoadingCorrectionRequests && correctionRequests.length === 0 && (
          <p className="p-6 text-sm text-token-text-secondary" role="status">
            Cargando historial de solicitudes...
          </p>
        )}
        {isErrorCorrectionRequests && (
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-t border-token-border-subtle p-4 text-sm text-token-text-secondary"
            role="alert"
          >
            <p>
              {isCorrectionRequestsNextPageError
                ? "No se pudieron cargar más solicitudes de tu historial."
                : "No se pudo cargar tu historial de solicitudes."}
            </p>
            <Button
              data-testid="worker-correction-history-retry"
              variant="secondary"
              size="sm"
              disabled={isFetchingMoreCorrectionRequests}
              onClick={retryCorrectionRequests}
            >
              Reintentar historial
            </Button>
          </div>
        )}
        {correctionRequests.length > 0 ? (
          <ul className="divide-y divide-token-border-subtle">
            {correctionRequests.map((request) => (
              <li key={request.id} className="space-y-2 p-6" data-testid="correction-history-entry">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-token-text-primary">
                      {CORRECTION_FIELD_TEXT[request.recordField]} · solicitud del{" "}
                      {formatCorrectionTimestamp(request.createdAt)}
                    </h4>
                    <p className="mt-1 text-xs text-token-text-secondary">
                      Valor solicitado:{" "}
                      {formatCorrectionTimestamp(Date.parse(request.requestedValue))}
                    </p>
                  </div>
                  <span
                    className={`rounded-md px-3 py-1 text-xs font-semibold ${CORRECTION_REQUEST_STATUS_COLORS[request.status]}`}
                  >
                    {CORRECTION_REQUEST_STATUS_TEXT[request.status]}
                  </span>
                </div>
                <p className="text-sm text-token-text-secondary">
                  Motivo de solicitud: {request.reason}
                </p>
                {request.resolvedAt && (
                  <p className="text-sm text-token-text-secondary">
                    Fecha de resolución: {formatCorrectionTimestamp(request.resolvedAt)}
                  </p>
                )}
                {request.status !== "pending" && (
                  <p className="text-sm text-token-text-secondary">
                    Responsable: {request.resolvedBy || "No informado"}
                  </p>
                )}
                {request.status === "rejected" && (
                  <p className="text-sm text-token-text-secondary">
                    Motivo de rechazo: {request.rejectionReason || "No informado"}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : !isLoadingCorrectionRequests && !isErrorCorrectionRequests ? (
          <p className="p-6 text-sm text-token-text-secondary">
            Todavía no tienes solicitudes de corrección.
          </p>
        ) : null}
        {hasMoreCorrectionRequests && (
          <div className="border-t border-token-border-subtle p-4 text-center">
            <Button
              data-testid="worker-correction-history-load-more"
              variant="secondary"
              size="sm"
              disabled={isFetchingMoreCorrectionRequests || isCorrectionRequestsNextPageError}
              onClick={loadMoreCorrectionRequests}
            >
              {isFetchingMoreCorrectionRequests ? "Cargando..." : "Cargar más solicitudes"}
            </Button>
          </div>
        )}
      </Card>

      {modalState.isOpen && modalState.record && modalState.field && (
        <CorrectionRequestModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ isOpen: false, record: null, field: null })}
          record={modalState.record}
          field={modalState.field}
        />
      )}
    </Container>
  );
};

// The default formatter props trigger a compiler bail-out in this view; retain
// the prop boundary memo until those defaults can be safely transformed.
export default React.memo(WorkerPortalView);
