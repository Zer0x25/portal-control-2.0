import { Syncable } from "./common";
import { Justification } from "./scheduling";
import { ClockingStatus } from "./ui";

export type TimeRecordField = "entrada" | "inicioColacion" | "finColacion" | "salida";
export type TimeRecordStatus =
  // Canonical statuses
  | "Laborando"
  | "Colacion"
  | "Completado"
  | "AnomaliaManual"
  | "Ausente"
  | "Permiso Especial"
  | "Vacaciones"
  | "Licencia Médica"
  | "DiaLibre"
  | "SinMarcajeTurnoAsignado"
  | "Feriado";

export interface DailyTimeRecord extends Syncable {
  id: string;
  employeeId: string;
  employeeName: string;
  employeePosition: string;
  employeeArea: string;
  employeeWorkdayType: string;
  date: string; // YYYY-MM-DD
  status: TimeRecordStatus;
  entrada?: string; // ISO-like datetime string
  inicioColacion?: string;
  finColacion?: string;
  salida?: string;
  entradaTimestamp?: number | null;
  inicioColacionTimestamp?: number | null;
  finColacionTimestamp?: number | null;
  salidaTimestamp?: number | null;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  scheduledHours?: number;
  scheduledColacionMinutes?: number;
  shiftPatternId?: string;
  shiftPatternName?: string;
  justification?: Justification | null;
  source?: "SELF_SERVICE" | "OPERATOR" | "KIOSK" | "KIOSK_BACKEND" | "WEB";
}

export type AttendanceStatus =
  | "Normal"
  | "Atraso"
  | "Ausente"
  | "Vacaciones"
  | "Licencia Médica"
  | "Permiso Especial"
  | "Feriado"
  | "DiaLibre";

export interface AttendanceRecord extends DailyTimeRecord {
  workedHours?: number;
  overtimeHours?: number;
  isDayOffWorked?: boolean;
  clockingStatus?: ClockingStatus;
  attendanceStatus?: AttendanceStatus;
  isLate?: boolean;
  lateMinutes?: number;
}

export interface CorrectionRequest extends Syncable {
  id: string;
  employeeId: string;
  timeRecordId: string;
  recordField: TimeRecordField;
  originalValue: string | undefined;
  requestedValue: string;
  reason: string;
  attachment?: {
    filename: string;
    mimeType: string;
    data: string;
  };
  status: "pending" | "approved" | "rejected";
  resolvedBy?: string;
  resolvedAt?: number;
  createdAt: number;
  rejectionReason?: string;
}

export interface CorrectionHistoryEvent {
  id: string;
  timestamp: string;
  actorUsername: string;
  action: "CORRECTION_REQUEST_CREATED" | "CORRECTION_REQUEST_STATUS_UPDATED" | string;
  category: string;
  details?: {
    requestId?: string;
    previousStatus?: string;
    newStatus?: string;
    rejectionReason?: string | null;
    status?: string;
    source?: string;
    [key: string]: unknown;
  };
}
