import {
  AttendanceRecord,
  UserRole,
  LeaveRecord,
  Holiday,
  CorrectionRequest,
  PlanningStatus,
  TimeRecordStatus,
} from "../types/index";
import { ClockingStatus } from "../types/ui";

export const TIME_RECORD_FIELD_LABELS: Record<string, string> = {
  entrada: "Inicio Jornada",
  inicioColacion: "Inicio Colación",
  finColacion: "Fin Colación",
  salida: "Fin Jornada",
};

export const TIME_RECORD_STATUS_CONFIG: Record<
  TimeRecordStatus,
  { label: string; bg: string; text: string }
> = {
  AnomaliaManual: {
    label: "Anomalía Manual",
    bg: "bg-token-status-anomalia-surface",
    text: "text-token-status-anomalia-text",
  },
  SinMarcajeTurnoAsignado: {
    label: "Sin Marcaje",
    bg: "bg-token-status-sin-marcaje-surface",
    text: "text-token-status-sin-marcaje-text",
  },
  Colacion: {
    label: "En Colación",
    bg: "bg-token-status-colacion-surface",
    text: "text-token-status-colacion-text",
  },
  Laborando: {
    label: "Laborando",
    bg: "bg-token-status-laborando-surface",
    text: "text-token-status-laborando-text",
  },
  Completado: {
    label: "Completado",
    bg: "bg-token-status-completado-surface",
    text: "text-token-status-completado-text",
  },
  Ausente: {
    label: "Ausente",
    bg: "bg-token-status-ausente-surface",
    text: "text-token-status-ausente-text",
  },
  "Permiso Especial": {
    label: "Permiso Especial",
    bg: "bg-token-status-permiso-especial-surface",
    text: "text-token-status-permiso-especial-text",
  },
  Vacaciones: {
    label: "Vacaciones",
    bg: "bg-token-status-vacaciones-surface",
    text: "text-token-status-vacaciones-text",
  },
  "Licencia Médica": {
    label: "Licencia Médica",
    bg: "bg-token-status-licencia-medica-surface",
    text: "text-token-status-licencia-medica-text",
  },
  DiaLibre: {
    label: "Día Libre",
    bg: "bg-token-surface-stripe border border-token-border-subtle",
    text: "text-token-text-secondary",
  },
  Feriado: {
    label: "Feriado",
    bg: "bg-token-status-feriado-surface",
    text: "text-token-status-feriado-text",
  },
};

export const CORRECTION_REQUEST_STATUS_TEXT: Record<CorrectionRequest["status"], string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
};

export const CORRECTION_REQUEST_STATUS_COLORS: Record<CorrectionRequest["status"], string> = {
  pending: "bg-token-status-warning-surface text-token-status-warning-text",
  approved: "bg-token-status-success-surface text-token-status-success-text",
  rejected: "bg-token-status-error-surface text-token-status-error-text",
};

export const USER_ROLES: UserRole[] = [
  "Usuario",
  "Reloj_Control",
  "Supervisor",
  "Fiscalizador",
  "Supervisor_Elevado",
  "Administrador",
];

export const ROLES: Record<string, UserRole> = {
  USER: "Usuario",
  CLOCK_CONTROL: "Reloj_Control",
  SUPERVISOR: "Supervisor",
  SUPERVISOR_ELEVATED: "Supervisor_Elevado",
  ADMIN: "Administrador",
  AUDITOR: "Fiscalizador",
};

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  Administrador: 5,
  Supervisor_Elevado: 4,
  Supervisor: 3,
  Reloj_Control: 2,
  Fiscalizador: 1,
  Usuario: 0,
  Archivado: -1, // Lowest possible level, no permissions
};

export const LEAVE_TYPES: LeaveRecord["type"][] = [
  "Vacaciones",
  "Licencia Médica",
  "Permiso Especial",
];

export const HOLIDAY_TYPES: Holiday["type"][] = ["Nacional", "Regional", "Específico"];

export const PLANNING_STATUS_CONFIG: Record<
  PlanningStatus,
  { label: string; dot: string; bg: string; text: string }
> = {
  Programado: {
    label: "Programado para trabajar",
    dot: "bg-token-status-laborando",
    bg: "bg-token-status-laborando-surface",
    text: "text-token-status-laborando-text",
  },
  DiaLibre: {
    label: "Día Libre",
    dot: "bg-token-text-tertiary",
    bg: "bg-token-surface-stripe",
    text: "text-token-text-secondary",
  },
  Vacaciones: {
    label: "Vacaciones",
    dot: "bg-token-status-vacaciones",
    bg: "bg-token-status-vacaciones-surface",
    text: "text-token-status-vacaciones-text",
  },
  LicenciaMedica: {
    label: "Licencia Médica",
    dot: "bg-token-status-licencia-medica",
    bg: "bg-token-status-licencia-medica-surface",
    text: "text-token-status-licencia-medica-text",
  },
  PermisoEspecial: {
    label: "Permiso Especial",
    dot: "bg-token-status-permiso-especial",
    bg: "bg-token-status-permiso-especial-surface",
    text: "text-token-status-permiso-especial-text",
  },
  Feriado: {
    label: "Feriado",
    dot: "bg-token-status-feriado",
    bg: "bg-token-status-feriado-surface",
    text: "text-token-status-feriado-text",
  },
  SinTurnoAsignado: {
    label: "Sin Turno Asignado",
    dot: "bg-token-status-no-programado",
    bg: "bg-token-status-no-programado-surface",
    text: "text-token-status-no-programado-text",
  },
};

export const CLOCKING_STATUS_CONFIG: Record<
  ClockingStatus,
  { label: string; dot: string; bg: string; text: string; description: string }
> = {
  en_jornada: {
    label: "En Jornada",
    dot: "bg-token-status-laborando",
    bg: "bg-token-status-laborando-surface",
    text: "text-token-status-laborando-text",
    description: "El empleado ha marcado su entrada y está trabajando.",
  },
  en_jornada_post_colacion: {
    label: "En Jornada",
    dot: "bg-token-status-laborando",
    bg: "bg-token-status-laborando-surface",
    text: "text-token-status-laborando-text",
    description: "El empleado ha regresado de su colación y está trabajando.",
  },
  en_colacion: {
    label: "En Colación",
    dot: "bg-token-status-colacion",
    bg: "bg-token-status-colacion-surface",
    text: "text-token-status-colacion-text",
    description: "El empleado ha iniciado su período de colación.",
  },
  fuera: {
    label: "Fuera de Turno",
    dot: "bg-token-text-tertiary",
    bg: "bg-token-surface-stripe",
    text: "text-token-text-secondary",
    description: "Estado genérico para personal que no ha iniciado jornada.",
  },
  por_iniciar: {
    label: "Por Iniciar",
    dot: "bg-token-status-sin-marcaje",
    bg: "bg-token-status-sin-marcaje-surface",
    text: "text-token-status-sin-marcaje-text",
    description: "El empleado tiene turno hoy pero aún no ha marcado entrada.",
  },
  no_programado: {
    label: "No Programado / Libre",
    dot: "bg-token-status-no-programado",
    bg: "bg-token-status-no-programado-surface",
    text: "text-token-status-no-programado-text",
    description: "El empleado no tiene turno asignado para el día de hoy.",
  },
  ausente: {
    label: "Ausente (Hoy)",
    dot: "bg-token-status-ausente",
    bg: "bg-token-status-ausente-surface",
    text: "text-token-status-ausente-text",
    description: "Se ha detectado una ausencia o licencia para el turno de hoy.",
  },
  terminada: {
    label: "Jornada Finalizada",
    dot: "bg-token-status-completado",
    bg: "bg-token-status-completado-surface",
    text: "text-token-status-completado-text",
    description: "El empleado completó su jornada y marcó la salida el día de hoy.",
  },
  jornada_terminada_anomalia: {
    label: "Finalizada (Anomalía)",
    dot: "bg-token-status-anomalia",
    bg: "bg-token-status-anomalia-surface",
    text: "text-token-status-anomalia-text",
    description:
      'La jornada del empleado fue cerrada por el sistema o manualmente como "SIN REGISTRO".',
  },
};

export const getContractClockingStatus = (
  record: AttendanceRecord | null | undefined,
  fallback: (record: AttendanceRecord | null | undefined) => ClockingStatus,
): ClockingStatus => {
  if (record?.clockingStatus) return record.clockingStatus;
  return fallback(record);
};

export const getContractAttendanceMetrics = (
  record: AttendanceRecord,
  fallback: (record: AttendanceRecord) => {
    scheduledHours: number;
    workedHours: number;
    overtimeHours: number;
    isDayOffWorked?: boolean;
  },
) => {
  if (
    typeof record.workedHours === "number" &&
    typeof record.overtimeHours === "number" &&
    typeof record.scheduledHours === "number"
  ) {
    return {
      scheduledHours: record.scheduledHours,
      workedHours: record.workedHours,
      overtimeHours: record.overtimeHours,
      isDayOffWorked: record.isDayOffWorked ?? false,
    };
  }

  return fallback(record);
};
