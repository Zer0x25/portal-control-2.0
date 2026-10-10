import { workCoordinator } from "./workCoordinator";
import { logger } from "../utils/logger";
import { withDirectTransaction } from "./db";
import { requestContext } from "../utils/context";
import { kpiService } from "./kpiService";
import { auditService } from "./auditService";
import { EmailService } from "./EmailService";
import { SocketService } from "./socketService";
import { TimeRecordService } from "./TimeRecordService";
import { timeRecordIntegrityService } from "./timeRecordIntegrityService";
import {
  determineNextPunchAction,
  shouldAutoClose,
  canExitWithIncompleteBreak,
  PunchAction,
  PunchState,
  PunchStatus,
} from "../domain/attendanceRules";
import { getChileDateISO, getMinutesFromMidnightChile } from "../utils/timeUtils";
import { TimeRecord, Prisma } from "../generated/prisma/client";

/** Narrow guard for spreading untyped JSON lifted from a `justification` column. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Reads the `justification` column as a spreadable object.
 *
 * The column is `String?` but historically held both serialized JSON and, in
 * rare legacy rows, a plain value. Anything that is not a JSON object is
 * preserved verbatim under `raw` so no data is silently dropped.
 */
const parseJustification = (value: string | null | undefined): Record<string, unknown> => {
  if (!value) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return { raw: value };
  }

  return isRecord(parsed) ? parsed : { raw: value };
};

const emailService = new EmailService();

/** Estados de día no laborable materializados por licencias (LeaveService.materializeDays). */
const LEAVE_DAY_STATUSES = ["Vacaciones", "Permiso Especial", "Licencia Médica", "DiaLibre"];

const hasAnyPunch = (record: {
  entrada?: string | null;
  inicioColacion?: string | null;
  finColacion?: string | null;
  salida?: string | null;
}) => Boolean(record.entrada || record.inicioColacion || record.finColacion || record.salida);

/** Schedule snapshot persisted alongside a punch so KPIs do not need a live lookup. */
type ScheduleSnapshot = Partial<
  Pick<
    TimeRecord,
    | "scheduledStartTime"
    | "scheduledEndTime"
    | "scheduledHours"
    | "scheduledColacionMinutes"
    | "shiftPatternId"
    | "shiftPatternName"
  >
>;

/** Free-form `justification` document attached to a time record. */
interface PunchJustification {
  raw?: unknown;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export class PunchService {
  static async handlePunch(
    req: { user?: { username: string } },
    employeeId: string,
    source?: string,
    forcedType?: string,
    latitude?: number,
    longitude?: number,
  ) {
    const user = req.user!;
    const now = new Date();
    const serverDate = getChileDateISO(now);
    const serverTime = now.toISOString();

    // 1. Transactional Block
    const result = await requestContext.run(
      { ...requestContext.getStore(), skipTrigger: true },
      async () => {
        return await withDirectTransaction(async (tx) => {
          // Anti doble-fichaje (caza-bugs 2026-10-04): sin esto, N punches
          // concurrentes no se ven entre sí (read-committed) y cada uno crea
          // su propia fila → registros duplicados mismo empleado/día. El lock
          // advisory serializa por empleado; los guards (ALREADY_PUNCHED_IN /
          // ACTION_ALREADY_TAKEN) vuelven a ser correctos. Xact-scoped: se
          // libera al commit, seguro tras PgBouncer.
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"punch:" + employeeId}))`;
          const employee = await tx.employee.findUnique({ where: { id: employeeId } });
          if (!employee) throw new Error("EMPLOYEE_NOT_FOUND");

          // Bloqueo por licencia de día completo (spec 030): una licencia,
          // vacación o permiso vigente hoy impide marcar. El marcaje no debe
          // sobrescribir la fila materializada por la licencia; el supervisor
          // debe eliminar la licencia primero.
          const activeLeave = await tx.leaveRecord.findFirst({
            where: {
              employeeId,
              isDeleted: false,
              startDate: { lte: serverDate },
              endDate: { gte: serverDate },
            },
            select: { id: true },
          });
          if (activeLeave) throw new Error("ON_LEAVE");

          let record = await tx.timeRecord.findFirst({
            where: {
              employeeId,
              isDeleted: false,
              OR: [
                {
                  status: {
                    notIn: ["Completado", "Ausente", "Feriado"],
                  },
                },
                { status: "Ausente", date: serverDate },
              ],
            },
            orderBy: { updatedAt: "desc" },
          });

          // Las filas de otros días no son la jornada de hoy (spec 030): una
          // fila futura nunca debe secuestrar el punch actual, y una fila de
          // licencia pasada sin marcajes no es una jornada abierta. Las
          // huérfanas con marcajes conservan el flujo actual (autocierre).
          if (record && record.date !== serverDate) {
            if (record.date > serverDate) {
              record = null;
            } else if (LEAVE_DAY_STATUSES.includes(record.status) && !hasAnyPunch(record)) {
              record = null;
            }
          }

          // Handle orphaned sessions
          if (record && record.status !== "Ausente" && shouldAutoClose(record)) {
            const autoClosed = await tx.timeRecord.update({
              where: { id: record.id },
              data: {
                status: "AnomaliaManual",
                salida: null,
                updatedAt: new Date(),
              },
            });
            await timeRecordIntegrityService.sealAfterMutation(
              tx,
              autoClosed.employeeId,
              autoClosed.id,
            );
            record = null;
          }

          let exceptionApplied = false;
          let exceptionType: "BREAK_INCOMPLETE_TIMEOUT" | null = null;
          let requiresReview = false;
          let elapsedBreakMin: number | undefined;
          let hasScheduleForException = true;

          let action: PunchAction;
          let nextStatus: PunchStatus;
          let updateField: keyof PunchState;

          const hasIncompleteBreak = Boolean(record?.inicioColacion && !record?.finColacion);

          if (record && hasIncompleteBreak && forcedType === "salida") {
            const breakWindow = canExitWithIncompleteBreak(
              record.inicioColacion,
              record.finColacion,
              now,
            );
            elapsedBreakMin = breakWindow.elapsedBreakMinutes;

            if (!breakWindow.allowed) {
              throw new Error("BREAK_INCOMPLETE_TOO_EARLY");
            }

            const hasSnapshotSchedule = Boolean(
              record.scheduledStartTime ||
              record.scheduledEndTime ||
              record.scheduledHours !== null,
            );

            let hasFallbackSchedule = false;
            if (!hasSnapshotSchedule) {
              try {
                const schedule = await kpiService.getEmployeeScheduleForDate(employee.id, now);
                hasFallbackSchedule = Boolean(schedule?.isWorkDay);
              } catch (error) {
                logger.error("Schedule fallback check error:", error);
              }
            }

            hasScheduleForException = hasSnapshotSchedule || hasFallbackSchedule;
            requiresReview = !hasScheduleForException;

            action = "SALIDA";
            updateField = "salida";
            nextStatus = requiresReview ? "AnomaliaManual" : "Completado";
            exceptionApplied = true;
            exceptionType = "BREAK_INCOMPLETE_TIMEOUT";
          } else {
            const transition = determineNextPunchAction(
              (record ?? { status: "Laborando" }) as PunchState,
              forcedType,
            );
            action = transition.action;
            nextStatus = transition.nextStatus;
            updateField = transition.updateField;
          }

          // --- SAFETY RULE: Flag Excess Shifts (>12h) as Anomaly ---
          // If closing a shift (SALIDA) and duration > 12h, force AnomaliaManual to ensure review.
          let autoJustification: PunchJustification | null = null;
          if ((action === "SALIDA" || updateField === "salida") && record && record.entrada) {
            const entryTime = new Date(record.entrada).getTime();
            const exitTime = now.getTime();
            const durationHours = (exitTime - entryTime) / (1000 * 60 * 60);

            if (durationHours > 12) {
              nextStatus = "AnomaliaManual";
              autoJustification = {
                type: "ExcesoJornada",
                reason: `Exceso de Jornada Legal (+12h). Duración: ${durationHours.toFixed(1)}h`,
              };
            }
          }
          // ---------------------------------------------------------

          let finalRecord;

          if (!record) {
            if (updateField === "entrada") {
              const existingRecord = await tx.timeRecord.findFirst({
                where: { employeeId, date: serverDate, entrada: { not: null }, isDeleted: false },
              });
              if (existingRecord) throw new Error("ALREADY_PUNCHED_IN");
            }

            let snapshotData: ScheduleSnapshot = {};
            try {
              const schedule = await kpiService.getEmployeeScheduleForDate(employee.id, now);
              if (schedule) {
                snapshotData = {
                  scheduledStartTime: schedule.startTime || null,
                  scheduledEndTime: schedule.endTime || null,
                  scheduledHours: schedule.hours || null,
                  scheduledColacionMinutes: schedule.colacionMinutes || null,
                  shiftPatternId: schedule.shiftPatternId || null,
                  shiftPatternName: schedule.shiftPatternName || null,
                };
              }
            } catch (err) {
              logger.error("Snapshot error:", err);
            }

            finalRecord = await tx.timeRecord.create({
              data: {
                employeeId: employee.id,
                employeeName: employee.name,
                employeePosition: employee.position,
                employeeArea: employee.area,
                employeeWorkdayType: employee.workdayType,
                date: serverDate,
                [updateField]: serverTime,
                status: nextStatus,
                source: source || "KIOSK_BACKEND",
                entradaLatitude: latitude || null,
                entradaLongitude: longitude || null,
                ...snapshotData,
              },
            });
            await timeRecordIntegrityService.sealAfterMutation(
              tx,
              finalRecord.employeeId,
              finalRecord.id,
            );
          } else {
            if (updateField && record[updateField]) {
              throw new Error("ACTION_ALREADY_TAKEN");
            }

            const dataToUpdate: Prisma.TimeRecordUncheckedUpdateInput = {
              [updateField]: serverTime,
              status: nextStatus,
              updatedAt: new Date(),
            };

            // Preserve traceability when an auto-generated absence is replaced by a real punch.
            if (record.status === "Ausente" && updateField === "entrada") {
              const currentJustification = parseJustification(record.justification);

              dataToUpdate.justification = JSON.stringify({
                ...currentJustification,
                metadata: {
                  ...(isRecord(currentJustification.metadata) ? currentJustification.metadata : {}),
                  replacedAbsenceByPunch: true,
                  replacedAt: new Date().toISOString(),
                  replacedBy: user.username,
                  replacedSource: source || "KIOSK_BACKEND",
                },
              });
            }

            if (autoJustification) {
              dataToUpdate.justification = JSON.stringify(autoJustification);
            }

            if (updateField === "entrada" || updateField === "salida") {
              dataToUpdate[`${updateField}Latitude`] = latitude || null;
              dataToUpdate[`${updateField}Longitude`] = longitude || null;
            }

            finalRecord = await tx.timeRecord.update({
              where: { id: record.id },
              data: dataToUpdate,
            });
            await timeRecordIntegrityService.sealAfterMutation(
              tx,
              finalRecord.employeeId,
              finalRecord.id,
            );
          }

          return {
            finalRecord,
            action,
            exceptionApplied,
            exceptionType,
            requiresReview,
            elapsedBreakMin,
            hasScheduleForException,
          };
        });
      },
    );

    // 2. Post-Punch Operations (Audit/Notifications)
    auditService.log({
      actorUsername: user.username,
      action: `Marcaje Exitoso: ${result.action}`,
      category: "CTRL_HOURS",
      severity: "INFO",
      outcome: "SUCCESS",
      details: {
        employeeId: result.finalRecord.employeeId,
        action: result.action,
        timestamp: serverTime,
      },
    });

    if (result.exceptionApplied && result.exceptionType === "BREAK_INCOMPLETE_TIMEOUT") {
      auditService.log({
        actorUsername: user.username,
        action: "SALIDA_CON_COLACION_INCOMPLETA",
        category: "CTRL_HOURS",
        severity: "WARNING",
        outcome: "SUCCESS",
        details: {
          employeeId: result.finalRecord.employeeId,
          recordId: result.finalRecord.id,
          elapsedBreakMin: result.elapsedBreakMin,
          hasSchedule: result.hasScheduleForException,
          requiresReview: result.requiresReview,
        },
      });
    }

    if (result.action === "ENTRADA") {
      void workCoordinator
        .run("lateness-notification", () =>
          this.notifyLateness(employeeId, result.finalRecord.employeeName, now),
        )
        .catch((error) => logger.error("Lateness notify error", error));
    }

    const enrichedRecord = await TimeRecordService.enrichRecord(result.finalRecord);

    SocketService.emit("timeRecord:created", {
      record: enrichedRecord,
      action: result.action,
    });

    return {
      action: result.action,
      record: enrichedRecord,
      timestamp: serverTime,
      exceptionApplied: result.exceptionApplied,
      exceptionType: result.exceptionType,
      requiresReview: result.requiresReview,
    };
  }

  private static async notifyLateness(employeeId: string, employeeName: string, now: Date) {
    try {
      const schedule = await kpiService.getEmployeeScheduleForDate(employeeId, now);
      if (schedule?.startTime) {
        const entranceMinutes = getMinutesFromMidnightChile(now);
        const [hour, minute] = schedule.startTime.split(":").map(Number);
        const delay = entranceMinutes - (hour * 60 + minute);
        if (delay > 15)
          await emailService.notifyTardiness(
            employeeName,
            schedule.startTime,
            now.toLocaleTimeString(),
            delay,
          );
      }
    } catch (error) {
      logger.error("Lateness notify error", error);
    }
  }
}
