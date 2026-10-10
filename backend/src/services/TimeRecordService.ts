import prisma, { withDirectTransaction } from "./db";
import {
  getChileDateISO,
  getMinutesFromMidnightChile,
  parseBusinessDateChile,
  parseTimeToMinutes,
} from "../utils/timeUtils";
import { normalizeString } from "../utils/stringUtils";
import { safeJsonParse } from "../utils/configUtils";
import { Prisma } from "../generated/prisma/client";
import { auditService } from "./auditService";
import { timeRecordIntegrityService } from "./timeRecordIntegrityService";
import { ulid } from "ulid";
import { OvertimeValidationService } from "./OvertimeValidationService";
import { schedulingService } from "./schedulingService";
import { KpiEngine } from "./kpi/KpiEngine";
import { KpiFormattingService } from "./kpi/KpiFormattingService";
import { AppError } from "../utils/AppError";
import type { TimeRecord } from "../generated/prisma/client";
import type { SchedulingContext } from "./schedulingService";
import type { VerifyFilters } from "./timeRecordIntegrityService";

/**
 * Shape accepted by the record writers. Mirrors the persisted `TimeRecord` columns
 * but keeps everything the client may legitimately omit or send as a raw value,
 * so callers can pass an unvalidated `req.body` without pre-minting a full row.
 */
type TimeRecordInput = {
  id?: string;
  employeeId: string;
  employeeName: string;
  employeePosition?: string | null;
  employeeArea?: string | null;
  employeeWorkdayType?: string | null;
  date: string;
  entrada?: string | null;
  inicioColacion?: string | null;
  finColacion?: string | null;
  salida?: string | null;
  status?: string | null;
  source?: string | null;
  /** Accepted as an already-serialized string or as a raw object to be stringified. */
  justification?: unknown;
};

type TimeRecordQuery = {
  page?: string | number;
  pageSize?: string | number;
  desde?: string;
  hasta?: string;
  name?: string;
  area?: string;
  workdayType?: string;
  status?: string;
  since?: string | number;
  employeeId?: string;
  showAnomalies?: string | boolean;
};

type ExportFilters = {
  startDate: string;
  endDate: string;
  employeeId?: string;
  area?: string;
  cargo?: string;
};

type RecordAuthUser = {
  role?: string;
  employeeId?: string | null;
};

/**
 * The identity/status subset of a time record that anomaly resolution reads.
 * Real rows come from Prisma (a superset); virtual rows are synthesized from the
 * employee alone, so only these columns are guaranteed to be present. Everything
 * outside the employee-identity block is optional because virtual rows omit it —
 * resolution supplies its own status and the `salida` fallback tolerates absence.
 */
type AnomalyRecord = Pick<
  TimeRecord,
  | "employeeId"
  | "date"
  | "employeeName"
  | "employeePosition"
  | "employeeArea"
  | "employeeWorkdayType"
> &
  Partial<Pick<TimeRecord, "status" | "salida" | "scheduledEndTime">>;

export class TimeRecordService {
  private static readonly kpiFormattingService = new KpiFormattingService();

  private static readonly ATTENDANCE_STATUS_BY_RECORD = new Map<string, string>([
    ["Ausente", "Ausente"],
    ["Vacaciones", "Vacaciones"],
    ["Licencia Médica", "Licencia Médica"],
    ["Permiso Especial", "Permiso Especial"],
    ["Feriado", "Feriado"],
    ["DiaLibre", "DiaLibre"],
  ]);

  private static readonly ATTENDANCE_STATUS_BY_PLANNING = new Map<string, string>([
    ["Vacaciones", "Vacaciones"],
    ["LicenciaMedica", "Licencia Médica"],
    ["PermisoEspecial", "Permiso Especial"],
    ["Feriado", "Feriado"],
    ["DiaLibre", "DiaLibre"],
  ]);

  private static deriveLateInfo(
    rec: TimeRecord,
    schedule: Awaited<ReturnType<typeof schedulingService.getEmployeeDailyScheduleInfo>>,
  ): { isLate: boolean; lateMinutes?: number } {
    if (!rec.entrada || !schedule?.isWorkDay || !schedule.startTime) {
      return { isLate: false };
    }

    const enteredMinutes = getMinutesFromMidnightChile(rec.entrada);
    const scheduledMinutes = parseTimeToMinutes(schedule.startTime);
    const lateMinutes = enteredMinutes - scheduledMinutes;

    if (lateMinutes > 15) {
      return { isLate: true, lateMinutes };
    }

    return { isLate: false };
  }

  private static deriveAttendanceStatus(
    rec: TimeRecord,
    schedule: Awaited<ReturnType<typeof schedulingService.getEmployeeDailyScheduleInfo>>,
    isLate: boolean,
  ): string | undefined {
    const recordStatus = typeof rec.status === "string" ? rec.status : undefined;
    if (recordStatus && TimeRecordService.ATTENDANCE_STATUS_BY_RECORD.has(recordStatus)) {
      return TimeRecordService.ATTENDANCE_STATUS_BY_RECORD.get(recordStatus);
    }

    const planningStatus = schedule?.planningStatus;
    if (planningStatus && TimeRecordService.ATTENDANCE_STATUS_BY_PLANNING.has(planningStatus)) {
      return TimeRecordService.ATTENDANCE_STATUS_BY_PLANNING.get(planningStatus);
    }

    if (isLate) return "Atraso";

    if (rec.entrada || rec.salida || rec.inicioColacion || rec.finColacion) {
      return "Normal";
    }

    if (schedule?.isWorkDay) {
      return "Ausente";
    }

    return undefined;
  }

  static async enrichRecord(rec: TimeRecord, context?: SchedulingContext) {
    // 1. Basic Enrichement (Legacy/Persistence Sync)
    const enriched = {
      ...rec,
      entradaTimestamp: rec.entrada ? new Date(rec.entrada).getTime() : null,
      inicioColacionTimestamp: rec.inicioColacion ? new Date(rec.inicioColacion).getTime() : null,
      finColacionTimestamp: rec.finColacion ? new Date(rec.finColacion).getTime() : null,
      salidaTimestamp: rec.salida ? new Date(rec.salida).getTime() : null,
      justification:
        rec.justification && typeof rec.justification === "string"
          ? JSON.parse(rec.justification)
          : rec.justification,
      syncStatus: "synced",
      lastModified: rec.updatedAt?.getTime() || Date.now(),
      isDeleted: rec.isDeleted || false,
    };

    // 2. Real-time KPI Calculation (Backend-First Truth)
    // Only if mandatory fields for calculation are present
    if (rec.employeeId && rec.date) {
      try {
        const schedule = await schedulingService.getEmployeeDailyScheduleInfo(
          rec.employeeId,
          new Date(rec.date + "T12:00:00Z"),
          context,
        );

        const metrics = KpiEngine.calculateDailyMetrics(
          rec,
          schedule,
          rec.employeeWorkdayType || "Ordinaria",
        );
        const { isLate, lateMinutes } = TimeRecordService.deriveLateInfo(rec, schedule);
        const attendanceStatus = TimeRecordService.deriveAttendanceStatus(rec, schedule, isLate);

        return {
          ...enriched,
          workedHours: metrics.workedHours,
          overtimeHours: metrics.overtimeHours,
          scheduledHours: metrics.scheduledHours,
          isDayOffWorked: metrics.isDayOffWorked || false,
          clockingStatus: TimeRecordService.kpiFormattingService.getEmployeeClockingStatus(rec),
          attendanceStatus,
          isLate,
          lateMinutes,
        };
      } catch (error) {
        console.error(
          `[TimeRecordService.enrichRecord] Failed to enrich KPI for ${rec.id}:`,
          error,
        );
      }
    }

    return enriched;
  }

  static async isRecordLocked(recordDate: string): Promise<boolean> {
    try {
      const now = new Date();
      const chileDate = getChileDateISO(now);
      const [currYear, currMonth] = chileDate.split("-").map(Number);

      // 1. Manual Accounting Lock
      const lockConfig = await prisma.systemConfig.findUnique({
        where: { key: "accounting_lock_date" },
      });
      if (lockConfig && lockConfig.value) {
        const manualLockDate = safeJsonParse<string>(lockConfig.value);
        if (manualLockDate && typeof manualLockDate === "string") {
          if (recordDate <= manualLockDate) return true;
        }
      }

      // 2. Automatic Rolling Lock
      let cutoffYear = currYear;
      let cutoffMonth = currMonth - 1;
      if (cutoffMonth <= 0) {
        cutoffMonth += 12;
        cutoffYear -= 1;
      }

      const autoLockDate = `${cutoffYear}-${String(cutoffMonth).padStart(2, "0")}-01`;
      if (recordDate < autoLockDate) return true;

      return false;
    } catch (error) {
      console.error("Error checking lock status:", error);
      return false;
    }
  }

  static async findLastPunch(employeeId: string) {
    return await prisma.timeRecord.findFirst({
      where: { employeeId, isDeleted: false },
      orderBy: { updatedAt: "desc" },
    });
  }

  private static parseEditableTimestamp(value: unknown, field: string): Date | null {
    if (value == null || value === "" || value === "SIN REGISTRO") {
      return null;
    }

    const parsed = new Date(String(value));
    if (isNaN(parsed.getTime())) {
      throw new AppError(`Timestamp inválido para ${field}.`, 400, "INVALID_TIME_RECORD_TIMESTAMP");
    }

    return parsed;
  }

  static async validateEditableRecord(recordData: {
    employeeId: string;
    employeeWorkdayType?: string | null;
    date: string;
    entrada?: string | null;
    inicioColacion?: string | null;
    finColacion?: string | null;
    salida?: string | null;
  }) {
    const timestamps = {
      entrada: this.parseEditableTimestamp(recordData.entrada, "entrada"),
      inicioColacion: this.parseEditableTimestamp(recordData.inicioColacion, "inicioColacion"),
      finColacion: this.parseEditableTimestamp(recordData.finColacion, "finColacion"),
      salida: this.parseEditableTimestamp(recordData.salida, "salida"),
    };

    if (timestamps.inicioColacion && !timestamps.entrada) {
      throw new AppError(
        "No se puede registrar inicio de colación sin entrada.",
        400,
        "INVALID_TIME_RECORD_SEQUENCE",
      );
    }

    if (timestamps.finColacion && !timestamps.inicioColacion) {
      throw new AppError(
        "No se puede registrar fin de colación sin inicio de colación.",
        400,
        "INVALID_TIME_RECORD_SEQUENCE",
      );
    }

    if (timestamps.salida && !timestamps.entrada) {
      throw new AppError(
        "No se puede registrar salida sin entrada.",
        400,
        "INVALID_TIME_RECORD_SEQUENCE",
      );
    }

    const orderedPairs: Array<[Date | null, Date | null, string]> = [
      [
        timestamps.entrada,
        timestamps.inicioColacion,
        "El inicio de colación debe ser posterior a la entrada.",
      ],
      [
        timestamps.inicioColacion,
        timestamps.finColacion,
        "El fin de colación debe ser posterior al inicio de colación.",
      ],
      [
        timestamps.finColacion,
        timestamps.salida,
        "La salida debe ser posterior al fin de colación.",
      ],
      [timestamps.entrada, timestamps.salida, "La salida debe ser posterior a la entrada."],
    ];

    for (const [previous, next, message] of orderedPairs) {
      if (previous && next && next <= previous) {
        throw new AppError(message, 400, "INVALID_TIME_RECORD_SEQUENCE");
      }
    }

    if (recordData.entrada && recordData.salida) {
      const entryDate = timestamps.entrada;
      const exitDate = timestamps.salida;
      if (entryDate && exitDate) {
        const shiftHours = (exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60);
        const breakHours =
          timestamps.inicioColacion && timestamps.finColacion
            ? Math.max(
                0,
                (timestamps.finColacion.getTime() - timestamps.inicioColacion.getTime()) /
                  (1000 * 60 * 60),
              )
            : shiftHours > 6
              ? 1
              : 0;
        const netShiftHours = Math.max(0, shiftHours - breakHours);
        if (shiftHours > 13.25 || netShiftHours > 12.25) {
          throw new AppError(
            "La salida no puede superar 12 horas de jornada efectiva desde la entrada.",
            400,
            "SHIFT_LENGTH_LIMIT_EXCEEDED",
          );
        }
      }

      const schedule = await schedulingService.getEmployeeDailyScheduleInfo(
        recordData.employeeId,
        parseBusinessDateChile(recordData.date),
      );
      const isArticle22 = recordData.employeeWorkdayType === "Artículo 22";
      const scheduledHours = schedule?.hours || 0;

      const validation = OvertimeValidationService.validate(
        scheduledHours,
        recordData.entrada,
        recordData.salida,
        isArticle22,
      );
      if (!validation.valid) {
        throw new AppError(
          validation.message ?? "Error de validación de horas extra.",
          400,
          "OVERTIME_VALIDATION_ERROR",
        );
      }
    }
  }

  /**
   * Crea o actualiza un registro de tiempo con validación de horas extras e integridad.
   */
  static async saveRecord(recordData: TimeRecordInput, actorUsername: string) {
    // Normalize identity: if caller doesn't send id, reuse existing employee/day row.
    // This prevents duplicate records for the same employee and business date.
    // New rows mint their id here (2026-10-04): Prisma rejects
    // findUnique/upsert with id undefined (500), and the route contract
    // (createOrUpdate, id opcional) promises create sin id pre-acuñado.
    if (!recordData.id && recordData.employeeId && recordData.date) {
      const existing = await prisma.timeRecord.findFirst({
        where: {
          employeeId: recordData.employeeId,
          date: recordData.date,
          isDeleted: false,
        },
        orderBy: { updatedAt: "desc" },
      });
      if (existing) {
        recordData.id = existing.id;
      }
    }
    recordData.id ??= ulid();

    const data: Prisma.TimeRecordUncheckedCreateInput = {
      employeeId: recordData.employeeId,
      employeeName: recordData.employeeName,
      employeePosition: recordData.employeePosition,
      employeeArea: recordData.employeeArea,
      employeeWorkdayType: recordData.employeeWorkdayType,
      date: recordData.date,
      entrada: recordData.entrada,
      inicioColacion: recordData.inicioColacion,
      finColacion: recordData.finColacion,
      salida: recordData.salida,
      status: recordData.status || "Laborando",
      source: recordData.source || "SELF_SERVICE",
      justification: recordData.justification
        ? typeof recordData.justification === "string"
          ? recordData.justification
          : JSON.stringify(recordData.justification)
        : null,
    };

    await this.validateEditableRecord({
      employeeId: data.employeeId,
      employeeWorkdayType: data.employeeWorkdayType,
      date: data.date,
      entrada: data.entrada,
      inicioColacion: data.inicioColacion,
      finColacion: data.finColacion,
      salida: data.salida,
    });

    return await withDirectTransaction(async (tx) => {
      const oldValue = await tx.timeRecord.findUnique({ where: { id: recordData.id } });

      // Automatic state cleaning: if anomaly state is now complete (entrada + salida), set to Completado
      if (
        (data.status === "AnomaliaManual" || data.status === "SinMarcajeTurnoAsignado") &&
        data.entrada &&
        data.salida &&
        data.entrada !== "SIN REGISTRO" &&
        data.salida !== "SIN REGISTRO"
      ) {
        data.status = "Completado";
      }

      const saved = await tx.timeRecord.upsert({
        where: { id: recordData.id },
        update: data,
        create: { id: recordData.id, ...data },
      });
      await timeRecordIntegrityService.sealAfterMutation(
        tx as Prisma.TransactionClient,
        saved.employeeId,
        saved.id,
      );

      await auditService.log({
        actorUsername,
        action: oldValue ? "TIME_RECORD_EDITED" : "TIME_RECORD_CREATED",
        category: "CTRL_HOURS",
        severity: oldValue ? "WARNING" : "INFO",
        details: {
          recordId: saved.id,
          employeeName: saved.employeeName,
          oldValue: oldValue ? await this.enrichRecord(oldValue) : null,
          newValue: await this.enrichRecord(saved),
        },
      });

      return saved;
    });
  }

  /**
   * Resolves an anomaly using predefined flows (Absence, Shift Hours Acknowledged).
   */
  static async resolveAnomaly(
    id: string,
    resolution:
      "ABSENCE_MARK" | "SHIFT_HOURS_ACK" | "PERMIT_MARK" | "DAY_OFF_MARK" | "VACATION_MARK",
    actorUsername: string,
  ) {
    const isVirtual = id.startsWith("MISSING-");
    let record: AnomalyRecord;

    if (!isVirtual) {
      record = await prisma.timeRecord.findUnique({ where: { id } });
      if (!record) throw new Error("RECORD_NOT_FOUND");
    } else {
      // Parse virtual ID: MISSING-employeeId-date
      const parts = id.split("-");
      // parts[0] = MISSING
      // parts[parts.length-3..parts.length-1] = YYYY, MM, DD
      const date = parts.slice(-3).join("-");
      const employeeId = parts.slice(1, -3).join("-");

      // Las anomalías virtuales futuras no pueden resolverse creando filas
      // a futuro (spec 030): el supervisor resuelve una vez llegado el día.
      if (date > getChileDateISO(new Date())) throw new Error("FUTURE_DATE");

      const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
      if (!employee) throw new Error("EMPLOYEE_NOT_FOUND");

      record = {
        employeeId,
        date,
        employeeName: employee.name,
        employeeArea: employee.area,
        employeePosition: employee.position,
        employeeWorkdayType: employee.workdayType,
      };
    }

    return await withDirectTransaction(async (tx) => {
      let result;

      if (isVirtual) {
        // If a real record already exists for employee/day, resolve by updating it.
        const existingForDay = await tx.timeRecord.findFirst({
          where: {
            employeeId: record.employeeId,
            date: record.date,
            isDeleted: false,
          },
          orderBy: { updatedAt: "desc" },
        });

        if (existingForDay) {
          record = existingForDay;
          const existingId = existingForDay.id;
          let updateData: Prisma.TimeRecordUpdateInput = {};
          if (resolution === "ABSENCE_MARK") {
            updateData = {
              status: "Ausente",
              entrada: "SIN REGISTRO",
              salida: "SIN REGISTRO",
              justification: JSON.stringify({
                type: "SYSTEM_ANOMALY",
                reason: "MISSING_MARK",
                resolution: "ABSENCE_MARK",
                comment: "Marcado manualmente como ausente por el supervisor.",
                metadata: { resolvedAt: new Date().toISOString(), resolvedBy: actorUsername },
              }),
            };
          } else if (resolution === "SHIFT_HOURS_ACK") {
            updateData = {
              status: "Completado",
              salida: existingForDay.salida || existingForDay.scheduledEndTime || "SIN REGISTRO",
              justification: JSON.stringify({
                type: "SYSTEM_ANOMALY",
                reason: "MISSING_MARK",
                resolution: "SHIFT_HOURS_ACK",
                comment: "Falta marcaje de salida; se validan horas de turno programado.",
                metadata: { resolvedAt: new Date().toISOString(), resolvedBy: actorUsername },
              }),
            };
          } else if (resolution === "PERMIT_MARK") {
            updateData = {
              status: "Permiso Especial",
              entrada: null,
              salida: null,
              justification: JSON.stringify({
                type: "Permiso Especial",
                reason: "MISSING_MARK",
                resolution: "PERMIT_MARK",
                comment: "Marcado manualmente como permiso especial por el supervisor.",
                metadata: { resolvedAt: new Date().toISOString(), resolvedBy: actorUsername },
              }),
            };
          } else if (resolution === "DAY_OFF_MARK") {
            updateData = {
              status: "DiaLibre",
              entrada: null,
              salida: null,
              justification: JSON.stringify({
                type: "Permiso Especial",
                reason: "MISSING_MARK",
                resolution: "DAY_OFF_MARK",
                comment: "Marcado manualmente como día libre/descanso por el supervisor.",
                metadata: { resolvedAt: new Date().toISOString(), resolvedBy: actorUsername },
              }),
            };
          } else if (resolution === "VACATION_MARK") {
            updateData = {
              status: "Vacaciones",
              entrada: null,
              salida: null,
              justification: JSON.stringify({
                type: "Vacaciones",
                reason: "MISSING_MARK",
                resolution: "VACATION_MARK",
                comment: "Marcado manualmente como vacaciones por el supervisor.",
                metadata: { resolvedAt: new Date().toISOString(), resolvedBy: actorUsername },
              }),
            };
          }

          result = await tx.timeRecord.update({
            where: { id: existingId },
            data: { ...updateData, updatedAt: new Date() },
          });
        } else {
          let createData: Prisma.TimeRecordUncheckedCreateInput = {
            employeeId: record.employeeId,
            date: record.date,
            employeeName: record.employeeName,
            employeeArea: record.employeeArea,
            employeePosition: record.employeePosition,
            employeeWorkdayType: record.employeeWorkdayType,
            status: "Laborando", // Temporary base status
            source: "SYSTEM",
          };

          if (resolution === "ABSENCE_MARK") {
            createData = {
              ...createData,
              status: "Ausente",
              entrada: "SIN REGISTRO",
              salida: "SIN REGISTRO",
              justification: JSON.stringify({
                type: "SYSTEM_ANOMALY",
                reason: "MISSING_MARK",
                resolution: "ABSENCE_MARK",
                comment: "Marcado manualmente como ausente por el supervisor.",
                metadata: { resolvedAt: new Date().toISOString(), resolvedBy: actorUsername },
              }),
            };
          } else if (resolution === "SHIFT_HOURS_ACK") {
            // Note: for shift hours ack we need the scheduled end time.
            // Since we don't have it easily here without a separate service call,
            // we use "SIN REGISTRO" as a fallback.
            createData = {
              ...createData,
              status: "Completado",
              salida: "SIN REGISTRO",
              justification: JSON.stringify({
                type: "SYSTEM_ANOMALY",
                reason: "MISSING_MARK",
                resolution: "SHIFT_HOURS_ACK",
                comment: "Falta marcaje de salida; se validan horas de turno programado.",
                metadata: { resolvedAt: new Date().toISOString(), resolvedBy: actorUsername },
              }),
            };
          } else if (resolution === "PERMIT_MARK") {
            createData = {
              ...createData,
              status: "Permiso Especial",
              justification: JSON.stringify({
                type: "Permiso Especial",
                reason: "MISSING_MARK",
                resolution: "PERMIT_MARK",
                comment: "Marcado manualmente como permiso especial por el supervisor.",
                metadata: { resolvedAt: new Date().toISOString(), resolvedBy: actorUsername },
              }),
            };
          } else if (resolution === "DAY_OFF_MARK") {
            createData = {
              ...createData,
              status: "DiaLibre",
              justification: JSON.stringify({
                type: "Permiso Especial",
                reason: "MISSING_MARK",
                resolution: "DAY_OFF_MARK",
                comment: "Marcado manualmente como día libre/descanso por el supervisor.",
                metadata: { resolvedAt: new Date().toISOString(), resolvedBy: actorUsername },
              }),
            };
          } else if (resolution === "VACATION_MARK") {
            createData = {
              ...createData,
              status: "Vacaciones",
              justification: JSON.stringify({
                type: "Vacaciones",
                reason: "MISSING_MARK",
                resolution: "VACATION_MARK",
                comment: "Marcado manualmente como vacaciones por el supervisor.",
                metadata: { resolvedAt: new Date().toISOString(), resolvedBy: actorUsername },
              }),
            };
          }

          result = await tx.timeRecord.create({ data: createData });
        }
      } else {
        let updateData: Prisma.TimeRecordUpdateInput = {};
        if (resolution === "ABSENCE_MARK") {
          updateData = {
            status: "Ausente",
            entrada: "SIN REGISTRO",
            salida: "SIN REGISTRO",
            justification: JSON.stringify({
              type: "SYSTEM_ANOMALY",
              reason: "MISSING_MARK",
              resolution: "ABSENCE_MARK",
              comment: "Marcado manualmente como ausente por el supervisor.",
              metadata: { resolvedAt: new Date().toISOString(), resolvedBy: actorUsername },
            }),
          };
        } else if (resolution === "SHIFT_HOURS_ACK") {
          updateData = {
            status: "Completado",
            salida: record.salida || record.scheduledEndTime || "SIN REGISTRO",
            justification: JSON.stringify({
              type: "SYSTEM_ANOMALY",
              reason: "AUTO_CLOSE_EXCEEDED_14H",
              resolution: "SHIFT_HOURS_ACK",
              comment: "Omitido marcaje de salida; se validan horas de turno programado.",
              metadata: { resolvedAt: new Date().toISOString(), resolvedBy: actorUsername },
            }),
          };
        } else if (resolution === "PERMIT_MARK") {
          updateData = {
            status: "Permiso Especial",
            entrada: null,
            salida: null,
            justification: JSON.stringify({
              type: "Permiso Especial",
              reason: "MISSING_MARK",
              resolution: "PERMIT_MARK",
              comment: "Marcado manualmente como permiso especial por el supervisor.",
              metadata: { resolvedAt: new Date().toISOString(), resolvedBy: actorUsername },
            }),
          };
        } else if (resolution === "DAY_OFF_MARK") {
          updateData = {
            status: "DiaLibre",
            entrada: null,
            salida: null,
            justification: JSON.stringify({
              type: "Permiso Especial",
              reason: "MISSING_MARK",
              resolution: "DAY_OFF_MARK",
              comment: "Marcado manualmente como día libre/descanso por el supervisor.",
              metadata: { resolvedAt: new Date().toISOString(), resolvedBy: actorUsername },
            }),
          };
        } else if (resolution === "VACATION_MARK") {
          updateData = {
            status: "Vacaciones",
            entrada: null,
            salida: null,
            justification: JSON.stringify({
              type: "Vacaciones",
              reason: "MISSING_MARK",
              resolution: "VACATION_MARK",
              comment: "Marcado manualmente como vacaciones por el supervisor.",
              metadata: { resolvedAt: new Date().toISOString(), resolvedBy: actorUsername },
            }),
          };
        }
        result = await tx.timeRecord.update({
          where: { id },
          data: { ...updateData, updatedAt: new Date() },
        });
      }

      await timeRecordIntegrityService.sealAfterMutation(
        tx as Prisma.TransactionClient,
        result.employeeId,
        result.id,
      );

      await auditService.log({
        actorUsername,
        action: isVirtual ? "VIRTUAL_ANOMALY_RESOLVED" : "TIME_RECORD_ANOMALY_RESOLVED",
        category: "CTRL_HOURS",
        severity: "INFO",
        details: {
          recordId: result.id,
          virtualId: isVirtual ? id : undefined,
          resolution,
          oldStatus: isVirtual ? "SinMarcaje" : record.status,
          newStatus: result.status,
        },
      });

      return await this.enrichRecord(result);
    });
  }

  /**
   * Procesa la carga masiva de marcajes.
   */
  static async createBulkRecords(records: TimeRecordInput[], actorUsername: string) {
    const formatted = records.map((r) => ({
      ...r,
      justification: r.justification ? JSON.stringify(r.justification) : null,
      status: r.status || "Laborando",
    }));

    const CHUNK_SIZE = 50;
    for (let i = 0; i < formatted.length; i += CHUNK_SIZE) {
      const chunk = formatted.slice(i, i + CHUNK_SIZE);
      await withDirectTransaction(async (tx) => {
        const created: TimeRecord[] = [];
        for (const row of chunk) {
          const result = await tx.timeRecord.create({ data: row });
          created.push(result);
        }

        const employees = new Map<string, string[]>();
        for (const item of created) {
          const list = employees.get(item.employeeId) ?? [];
          list.push(item.id);
          employees.set(item.employeeId, list);
        }

        for (const [employeeId, ids] of employees.entries()) {
          for (const id of ids) {
            await timeRecordIntegrityService.sealAfterMutation(
              tx as Prisma.TransactionClient,
              employeeId,
              id,
            );
          }
        }
      });
    }

    await auditService.log({
      actorUsername,
      action: "CARGA_MASIVA_MARCAJES",
      category: "CTRL_HOURS",
      severity: "INFO",
      details: { count: records.length },
    });

    return records.length;
  }

  /**
   * Obtiene y pagina registros de tiempo con filtros complejos.
   */
  static async listRecords(query: TimeRecordQuery, authUser?: RecordAuthUser) {
    const {
      page = 1,
      pageSize = 50,
      desde,
      hasta,
      name,
      area,
      workdayType,
      status,
      since,
      employeeId,
      showAnomalies,
    } = query;
    const pageNum = Number(page);
    const pageSizeNum = Number(pageSize);
    const where: Prisma.TimeRecordWhereInput = {};

    if (status) {
      where.status = status as string;
    } else if (showAnomalies === "true" || showAnomalies === true) {
      where.status = {
        in: ["AnomaliaManual", "SinMarcajeTurnoAsignado"],
      };
    }

    // Base Filters
    if (since) {
      where.updatedAt = { gte: new Date(Number(since)) };
    } else {
      where.isDeleted = false;
    }

    if (desde || hasta) {
      const dateFilter: Prisma.StringFilter = {};
      if (desde) dateFilter.gte = desde;
      if (hasta) dateFilter.lte = hasta;
      where.date = dateFilter;
    }

    // Security context filtering
    if (authUser?.role === "Usuario" || authUser?.role === "Kiosk_Employee") {
      const effectiveId = authUser.employeeId;
      if (!effectiveId) throw new Error("UNAUTHORIZED_NO_EMPLOYEE");
      where.employeeId = effectiveId;
    } else if (employeeId) {
      where.employeeId = employeeId as string;
    }

    // Name search optimization
    if (name) {
      const normalizedSearch = normalizeString(name as string).toLowerCase();
      const allEmployees = await prisma.employee.findMany({ select: { id: true, name: true } });
      const matchingIds = allEmployees
        .filter((e) => normalizeString(e.name).toLowerCase().includes(normalizedSearch))
        .map((e) => e.id);
      where.employeeId = where.employeeId
        ? { in: [where.employeeId as string].filter((id) => matchingIds.includes(id)) }
        : { in: matchingIds };
    }

    if (area) where.employeeArea = area as string;
    if (workdayType && workdayType !== "TODOS") where.employeeWorkdayType = workdayType as string;

    let rawRecords;
    let total = 0;
    const isAnomalyFilter = showAnomalies === "true" || showAnomalies === true;

    if (since || pageSizeNum === -1 || isAnomalyFilter) {
      rawRecords = await prisma.timeRecord.findMany({
        where,
        orderBy: isAnomalyFilter ? [{ date: "desc" }, { createdAt: "desc" }] : { updatedAt: "asc" },
      });
      total = rawRecords.length;
    } else {
      const skip = (pageNum - 1) * pageSizeNum;
      [rawRecords, total] = await Promise.all([
        prisma.timeRecord.findMany({
          where,
          skip,
          take: pageSizeNum,
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        }),
        prisma.timeRecord.count({ where }),
      ]);
    }

    // ⚡ Bolt Optimization: Batch fetch SchedulingContext to prevent N+1 queries during enrichment
    let context: SchedulingContext | undefined;
    if (rawRecords.length > 0) {
      const uniqueEmployeeIds = [...new Set(rawRecords.map((r) => r.employeeId))] as string[];
      let minDateStr = rawRecords[0].date;
      let maxDateStr = rawRecords[0].date;

      for (const r of rawRecords) {
        if (r.date < minDateStr) minDateStr = r.date;
        if (r.date > maxDateStr) maxDateStr = r.date;
      }

      context = await schedulingService.getSchedulingContext(
        uniqueEmployeeIds,
        minDateStr,
        maxDateStr,
      );
    }

    let enriched = await Promise.all(rawRecords.map((r) => this.enrichRecord(r, context)));

    // Synthesis of Virtual "Missing Mark" Anomalies
    if (isAnomalyFilter && desde && hasta && pageSizeNum !== -1) {
      const { closureValidationService } = await import("./closureValidationService");
      const blocks = await closureValidationService.getBlockingItems(
        desde as string,
        hasta as string,
      );

      const normalizeOrEmpty = (value?: string | null) =>
        normalizeString(value || "")
          .toLowerCase()
          .trim();
      const normalizedName = typeof name === "string" ? normalizeOrEmpty(name) : "";
      const authScopedEmployeeId =
        authUser?.role === "Usuario" || authUser?.role === "Kiosk_Employee"
          ? (authUser.employeeId as string | undefined)
          : undefined;
      const requestedEmployeeId =
        typeof employeeId === "string" && employeeId.length > 0 ? employeeId : undefined;

      const virtualAnomalies = blocks.anomalies
        .filter((a) => a.status === "SinMarcajeTurnoAsignado")
        .filter((a) => {
          if (authScopedEmployeeId && a.employeeId !== authScopedEmployeeId) return false;
          if (requestedEmployeeId && a.employeeId !== requestedEmployeeId) return false;
          if (area && a.employeeArea !== area) return false;
          if (workdayType && workdayType !== "TODOS" && a.employeeWorkdayType !== workdayType)
            return false;
          if (normalizedName && !normalizeOrEmpty(a.employeeName).includes(normalizedName))
            return false;
          return true;
        })
        .map((a) => ({
          ...a,
          entrada: null,
          salida: null,
          justification: a.justification
            ? typeof a.justification === "string"
              ? JSON.parse(a.justification)
              : a.justification
            : {
                type: "SYSTEM_ANOMALY",
                reason: "NO_TIME_RECORD_WITH_ASSIGNED_SHIFT",
                comment: "Falta marcaje para el turno asignado.",
              },
          createdAt: new Date(a.date).getTime(),
          updatedAt: new Date(a.date),
        }));

      // Merge and Re-sort ALL entries (essential for consistent pagination)
      const allEntries = [...enriched, ...virtualAnomalies];
      allEntries.sort((a, b) => {
        const dateA = a.date || "";
        const dateB = b.date || "";
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return (b.createdAt || 0) - (a.createdAt || 0);
      });

      total = allEntries.length;
      const skip = (pageNum - 1) * pageSizeNum;
      enriched = allEntries.slice(skip, skip + pageSizeNum);
    }

    return {
      data: enriched,
      total,
      page: pageNum,
      totalPages: pageSizeNum > 0 ? Math.ceil(total / pageSizeNum) : 1,
    };
  }

  /**
   * Procesa los cierres automáticos de jornadas abiertas.
   */
  static async processAutoClosures(): Promise<number> {
    const now = new Date();
    const chileDate = getChileDateISO(now);

    // Get open records from previous days
    const openRecords = await prisma.timeRecord.findMany({
      where: {
        status: { in: ["Laborando", "Colacion"] },
        date: { lt: chileDate },
        isDeleted: false,
      },
    });

    if (openRecords.length === 0) return 0;

    const results = await withDirectTransaction(async (tx) => {
      const updatedList = [];
      for (const rec of openRecords) {
        const updated = await tx.timeRecord.update({
          where: { id: rec.id },
          data: {
            status: "AnomaliaManual",
            salida: null, // Leave empty to force audit/repair
            justification: JSON.stringify({
              type: "SYSTEM_ANOMALY",
              reason: "AUTO_CLOSE_END_OF_DAY",
              comment: "Cerrado automáticamente al final del día por sistema pendiendo revisión.",
              metadata: {
                autoClosedAt: now.toISOString(),
                originalDate: rec.date,
              },
            }),
          },
        });
        await timeRecordIntegrityService.sealAfterMutation(
          tx as Prisma.TransactionClient,
          updated.employeeId,
          updated.id,
        );
        updatedList.push(updated);
      }
      return updatedList;
    });

    return results.length;
  }

  /**
   * Obtiene registros para exportación (JSON legado).
   */
  static async listRecordsForExport(filters: ExportFilters) {
    const { startDate, endDate, employeeId, area, cargo } = filters;
    const where: Prisma.TimeRecordWhereInput = {
      date: { gte: startDate as string, lte: endDate as string },
      isDeleted: false,
    };
    if (employeeId) where.employeeId = employeeId as string;
    if (area) where.employeeArea = area as string;
    if (cargo) where.employeePosition = cargo as string;

    const records = await prisma.timeRecord.findMany({
      where,
      orderBy: { date: "asc" },
      take: 20000,
    });

    // ⚡ Bolt Optimization: Batch fetch SchedulingContext to prevent N+1 queries during enrichment
    let context: SchedulingContext | undefined;
    if (records.length > 0) {
      const uniqueEmployeeIds = [...new Set(records.map((r) => r.employeeId))] as string[];
      let minDateStr = records[0].date;
      let maxDateStr = records[0].date;

      for (const r of records) {
        if (r.date < minDateStr) minDateStr = r.date;
        if (r.date > maxDateStr) maxDateStr = r.date;
      }

      context = await schedulingService.getSchedulingContext(
        uniqueEmployeeIds,
        minDateStr,
        maxDateStr,
      );
    }

    return await Promise.all(records.map((r) => this.enrichRecord(r, context)));
  }

  /**
   * Elimina un registro con integridad y auditoría.
   */
  static async deleteRecord(id: string, actorUsername: string) {
    const record = await prisma.timeRecord.findUnique({ where: { id } });
    if (!record) throw new Error("RECORD_NOT_FOUND");

    if (await this.isRecordLocked(record.date)) {
      throw new Error("RECORD_LOCKED");
    }

    await withDirectTransaction(async (tx) => {
      const deleted = await tx.timeRecord.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      await timeRecordIntegrityService.sealAfterMutation(
        tx as Prisma.TransactionClient,
        deleted.employeeId,
        deleted.id,
      );

      const enrichedOld = await this.enrichRecord(record);

      await auditService.log({
        actorUsername,
        action: "TIME_RECORD_DELETED",
        category: "CTRL_HOURS",
        severity: "CRITICAL",
        details: {
          recordId: id,
          employeeName: record.employeeName,
          deletedRecord: enrichedOld,
        },
      });
    });

    return true;
  }

  /**
   * Verifica la integridad de la cadena de marcajes en una transacción.
   */
  static async verifyIntegrity(params: VerifyFilters) {
    return await withDirectTransaction((tx) =>
      timeRecordIntegrityService.verifyChain(tx as Prisma.TransactionClient, params),
    );
  }
}
