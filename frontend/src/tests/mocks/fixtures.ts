import type { AttendanceRecord } from "../../types/time";
import type { ShiftReport } from "../../types/logbook";
import type { KpiDetails, ReportStatKpis } from "../../types/kpi";

/**
 * Fixtures deterministas para los handlers de MSW (spec 035, T1).
 *
 * "Determinista" significa **sin fechas relativas al reloj**: todos los
 * identificadores, fechas y numeros son fijos, de modo que un test que
 * compare un snapshot o un conteo no cambie entre dias.
 */

/** Marcador de tiempo fijo (epoch ms): el backend serializa `lastModified` como numero. */
export const FIXED_TIMESTAMP_MS = 1772361600000;

/** Marcador de tiempo fijo en ISO (campos de fecha que el backend manda como texto). */
export const FIXED_TIMESTAMP = "2026-03-01T08:00:00.000Z";

/** Fijo de una marcacion de tiempo. */
export const attendanceRecordFixture: AttendanceRecord = {
  id: "r-fixture-1",
  employeeId: "e-fixture-1",
  employeeName: "Ana Fixture",
  employeePosition: "Operador",
  employeeArea: "Operaciones",
  employeeWorkdayType: "Normal",
  date: "2026-03-01",
  status: "Completado",
  entrada: "2026-03-01T08:00:00.000Z",
  salida: "2026-03-01T17:00:00.000Z",
  workedHours: 8,
  isLate: false,
  lateMinutes: 0,
  lastModified: FIXED_TIMESTAMP_MS,
  syncStatus: "synced",
  isDeleted: false,
};

/** Fijo de una bitácora de turno cerrada. */
export const shiftReportFixture: ShiftReport = {
  id: "sr-fixture-1",
  folio: "F-0001",
  date: "2026-03-01",
  shiftName: "Turno A",
  responsibleUser: "ana",
  startTime: "08:00",
  endTime: "17:00",
  status: "closed",
  logEntries: [],
  supplierEntries: [],
  reportCreatedAt: FIXED_TIMESTAMP,
  updatedAt: FIXED_TIMESTAMP,
  lastModified: FIXED_TIMESTAMP,
  syncStatus: "synced",
  isDeleted: false,
};

/** KPIs agregados (sin detalle por empleado). */
export const reportStatKpisFixture: ReportStatKpis = {
  tardinessCount: 3,
  absenceCount: 1,
  vacationCount: 0,
  medicalLeaveCount: 0,
  specialPermitCount: 0,
  overtimePercentage: 4.5,
  avgWeeklyHours: 41.25,
  tardinessRate: 12.5,
  unjustifiedAbsenceRate: 2.5,
  justifiedAbsenceRate: 0,
  vacationRate: 0,
  medicalLeaveRate: 0,
  specialPermitRate: 0,
  totalAbsenteeismRate: 2.5,
  absenceRate: 2.5,
};

/** Detalle de KPIs (vacío: los tests asserted sobre los agregados). */
export const kpiDetailsFixture: KpiDetails = {
  tardyRecords: [],
  absentEmployees: [],
  vacationRecords: [],
  medicalLeaveRecords: [],
  specialPermitRecords: [],
};
