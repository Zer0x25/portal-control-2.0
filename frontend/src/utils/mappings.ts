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
    bg: "bg-red-100 dark:bg-red-900/50",
    text: "text-red-800 dark:text-red-300",
  },
  SinMarcajeTurnoAsignado: {
    label: "Sin Marcaje",
    bg: "bg-orange-100 dark:bg-orange-900/50",
    text: "text-orange-800 dark:text-orange-300",
  },
  Colacion: {
    label: "En Colación",
    bg: "bg-indigo-100 dark:bg-indigo-900/50",
    text: "text-indigo-800 dark:text-indigo-300",
  },
  Laborando: {
    label: "Laborando",
    bg: "bg-green-100 dark:bg-green-900/50",
    text: "text-green-800 dark:text-green-300",
  },
  Completado: {
    label: "Completado",
    bg: "bg-blue-100 dark:bg-blue-900/50",
    text: "text-blue-800 dark:text-blue-300",
  },
  Ausente: {
    label: "Ausente",
    bg: "bg-rose-100 dark:bg-rose-900/50",
    text: "text-rose-800 dark:text-rose-300",
  },
  "Permiso Especial": {
    label: "Permiso Especial",
    bg: "bg-amber-100 dark:bg-amber-900/50",
    text: "text-amber-800 dark:text-amber-300",
  },
  Vacaciones: {
    label: "Vacaciones",
    bg: "bg-cyan-100 dark:bg-cyan-900/50",
    text: "text-cyan-800 dark:text-cyan-300",
  },
  "Licencia Médica": {
    label: "Licencia Médica",
    bg: "bg-sky-100 dark:bg-sky-900/50",
    text: "text-sky-800 dark:text-sky-300",
  },
  DiaLibre: {
    label: "Día Libre",
    bg: "bg-token-surface-stripe border border-token-border-subtle",
    text: "text-token-text-secondary",
  },
  Feriado: {
    label: "Feriado",
    bg: "bg-yellow-100 dark:bg-yellow-900/50",
    text: "text-yellow-800 dark:text-yellow-300",
  },
};

export const CORRECTION_REQUEST_STATUS_TEXT: Record<CorrectionRequest["status"], string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
};

export const CORRECTION_REQUEST_STATUS_COLORS: Record<CorrectionRequest["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
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
    dot: "bg-green-500",
    bg: "bg-green-100",
    text: "text-green-800",
  },
  DiaLibre: {
    label: "Día Libre",
    dot: "bg-token-text-tertiary",
    bg: "bg-token-surface-stripe",
    text: "text-token-text-secondary",
  },
  Vacaciones: {
    label: "Vacaciones",
    dot: "bg-blue-500",
    bg: "bg-blue-100",
    text: "text-blue-800",
  },
  LicenciaMedica: {
    label: "Licencia Médica",
    dot: "bg-purple-500",
    bg: "bg-purple-100",
    text: "text-purple-800",
  },
  PermisoEspecial: {
    label: "Permiso Especial",
    dot: "bg-orange-500",
    bg: "bg-orange-100",
    text: "text-orange-800",
  },
  Feriado: {
    label: "Feriado",
    dot: "bg-yellow-500",
    bg: "bg-yellow-100",
    text: "text-yellow-800",
  },
  SinTurnoAsignado: {
    label: "Sin Turno Asignado",
    dot: "bg-token-text-tertiary",
    bg: "bg-token-surface-stripe",
    text: "text-token-text-secondary",
  },
};

export const CLOCKING_STATUS_CONFIG: Record<
  ClockingStatus,
  { label: string; dot: string; bg: string; text: string; description: string }
> = {
  en_jornada: {
    label: "En Jornada",
    dot: "bg-green-500",
    bg: "bg-green-100 dark:bg-green-900/50",
    text: "text-green-800 dark:text-green-300",
    description: "El empleado ha marcado su entrada y está trabajando.",
  },
  en_jornada_post_colacion: {
    label: "En Jornada",
    dot: "bg-green-500",
    bg: "bg-green-100 dark:bg-green-900/50",
    text: "text-green-800 dark:text-green-300",
    description: "El empleado ha regresado de su colación y está trabajando.",
  },
  en_colacion: {
    label: "En Colación",
    dot: "bg-yellow-500",
    bg: "bg-yellow-100 dark:bg-yellow-900/50",
    text: "text-yellow-800 dark:text-yellow-300",
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
    dot: "bg-orange-400",
    bg: "bg-orange-100 dark:bg-orange-900/50",
    text: "text-orange-800 dark:text-orange-300",
    description: "El empleado tiene turno hoy pero aún no ha marcado entrada.",
  },
  no_programado: {
    label: "No Programado / Libre",
    dot: "bg-indigo-300",
    bg: "bg-indigo-100 dark:bg-indigo-900/50",
    text: "text-indigo-800 dark:text-indigo-300",
    description: "El empleado no tiene turno asignado para el día de hoy.",
  },
  ausente: {
    label: "Ausente (Hoy)",
    dot: "bg-rose-500",
    bg: "bg-rose-100 dark:bg-rose-900/50",
    text: "text-rose-800 dark:text-rose-300",
    description: "Se ha detectado una ausencia o licencia para el turno de hoy.",
  },
  terminada: {
    label: "Jornada Finalizada",
    dot: "bg-blue-500",
    bg: "bg-blue-100 dark:bg-blue-900/50",
    text: "text-blue-800 dark:text-blue-300",
    description: "El empleado completó su jornada y marcó la salida el día de hoy.",
  },
  jornada_terminada_anomalia: {
    label: "Finalizada (Anomalía)",
    dot: "bg-red-500",
    bg: "bg-red-100 dark:bg-red-900/50",
    text: "text-red-800 dark:text-red-300",
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
