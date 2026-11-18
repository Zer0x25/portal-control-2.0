import prisma, { withDirectTransaction } from "./db";
import { ACCOUNTING_TRANSACTION_OPTIONS } from "./accountingTransaction";
import { SocketService } from "./socketService";
import { OvertimeValidationService } from "./OvertimeValidationService";
import { schedulingService } from "./schedulingService";
import { parseBusinessDateChile } from "../utils/timeUtils";
import { AppError } from "../utils/AppError";
import { redactAuditFields } from "../modules/audit";
import { TimeRecordService } from "./TimeRecordService";
import { timeRecordIntegrityService } from "./timeRecordIntegrityService";
import { Prisma, TimeRecord } from "../generated/prisma/client";

export interface CorrectionListParams {
  since?: string;
  limit?: number;
  offset?: number;
  status?: string;
}

/**
 * Time-record fields a correction request is allowed to target.
 * Mirrors the `validFields` allow-list enforced in `updateStatus`.
 */
export type CorrectableRecordField = "entrada" | "inicioColacion" | "finColacion" | "salida";

/**
 * Payload accepted by `create`. Mirrors `CorrectionRequest` columns; every field is
 * optional because the body originates from an unvalidated HTTP request.
 */
export interface CreateCorrectionData {
  id?: string;
  employeeId?: string;
  timeRecordId?: string;
  recordField?: string;
  originalValue?: string | null;
  requestedValue?: string;
  reason?: string;
}

const isSelfOnly = (user: { role: string }) =>
  user.role === "Usuario" || user.role === "Kiosk_Employee";

function requireLinkedEmployee(user: { role: string; employeeId?: string }) {
  if (isSelfOnly(user) && !user.employeeId) {
    throw new AppError("Usuario sin empleado vinculado.", 403, "FORBIDDEN");
  }
}

type AuditEntry = {
  actorUsername: string;
  action: string;
  category: string;
  severity?: string;
  outcome?: string;
  details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

async function writeAudit(tx: Prisma.TransactionClient, entry: AuditEntry) {
  const safe = redactAuditFields(entry.action, entry.details, entry.metadata);
  return tx.auditLog.create({
    data: {
      actorUsername: entry.actorUsername,
      action: entry.action,
      category: entry.category,
      severity: entry.severity || "INFO",
      outcome: entry.outcome || "SUCCESS",
      details: safe.details as Prisma.InputJsonValue,
      metadata: safe.metadata as Prisma.InputJsonValue,
    },
  });
}

async function lockAccounting(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(17018, hashtext(${"accounting_lock_date"}))`;
}

async function lockEmployeeRecords(tx: Prisma.TransactionClient, employeeId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"punch:" + employeeId}))`;
}

function sameValue(left: string | null | undefined, right: string | null | undefined) {
  const normalize = (value: string | null | undefined) => {
    if (!value || value === "SIN REGISTRO") return "";
    const time = Date.parse(value);
    return Number.isNaN(time) ? value : String(time);
  };
  return normalize(left) === normalize(right);
}

export class CorrectionService {
  /**
   * Lists correction requests with optional filtering and pagination.
   * Enforces role-based visibility rules.
   */
  static async list(params: CorrectionListParams, user: { role: string; employeeId?: string }) {
    requireLinkedEmployee(user);
    const { since, limit, offset, status } = params;
    const where: Prisma.CorrectionRequestWhereInput = {};

    if (since) {
      const sinceDate = new Date(Number(since));
      if (!isNaN(sinceDate.getTime())) {
        where.updatedAt = { gte: sinceDate };
      }
    } else {
      where.isDeleted = false;
    }

    if (status) {
      where.status = status;
    }

    // Role-based visibility: Users only see their own requests
    if (isSelfOnly(user) && user.employeeId) {
      where.employeeId = user.employeeId;
    }

    const total = await prisma.correctionRequest.count({ where });
    const requests = await prisma.correctionRequest.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
      skip: offset,
    });

    const mapped = requests.map((r) => ({
      ...r,
      lastModified: r.updatedAt.getTime(),
      syncStatus: "synced",
      isDeleted: r.isDeleted || false,
    }));

    return { requests: mapped, total };
  }

  /**
   * Creates a new correction request.
   * Includes security checks, overtime validation, and real-time notification.
   */
  static async create(
    data: CreateCorrectionData,
    user: { role: string; employeeId?: string; username?: string; id?: string },
  ) {
    // 1. Security Check: Ownership validation for regular users
    if (isSelfOnly(user)) {
      const userEmpId = user.employeeId?.toString();
      const dataEmpId = data.employeeId?.toString();

      if (!userEmpId || dataEmpId !== userEmpId) {
        throw new Error("FORBIDDEN_OWNERSHIP");
      }
    }

    const record = await prisma.timeRecord.findUnique({ where: { id: data.timeRecordId } });
    if (!record || record.isDeleted) {
      throw new AppError("Registro de tiempo no encontrado.", 404, "TIME_RECORD_NOT_FOUND");
    }
    // Las correcciones no pueden apuntar al futuro (spec 030).
    if (new Date(data.requestedValue).getTime() > Date.now()) {
      throw new AppError(
        "No se puede solicitar una corrección con fecha futura.",
        400,
        "FUTURE_CORRECTION",
      );
    }
    if (record.employeeId !== data.employeeId) {
      throw new AppError("La jornada no pertenece al empleado indicado.", 403, "FORBIDDEN");
    }

    // 2. Overtime Validation: Check legal limits if altering core times
    if (
      data.recordField === "entrada" ||
      data.recordField === "inicioColacion" ||
      data.recordField === "finColacion" ||
      data.recordField === "salida"
    ) {
      const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } });

      if (record && employee) {
        let proposedEntrada = record.entrada;
        let proposedSalida = record.salida;

        if (data.recordField === "entrada") proposedEntrada = data.requestedValue;
        if (data.recordField === "salida") proposedSalida = data.requestedValue;

        if (proposedEntrada && proposedSalida) {
          const entryDate = new Date(proposedEntrada);
          const exitDate = new Date(proposedSalida);
          if (!isNaN(entryDate.getTime()) && !isNaN(exitDate.getTime())) {
            const shiftHours = (exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60);
            const proposedInicioColacion =
              data.recordField === "inicioColacion" ? data.requestedValue : record?.inicioColacion;
            const proposedFinColacion =
              data.recordField === "finColacion" ? data.requestedValue : record?.finColacion;
            const breakHours =
              proposedInicioColacion && proposedFinColacion
                ? Math.max(
                    0,
                    (new Date(proposedFinColacion).getTime() -
                      new Date(proposedInicioColacion).getTime()) /
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
            data.employeeId,
            parseBusinessDateChile(record.date),
          );

          const isArticle22 = employee.workdayType === "Articulo 22";
          const scheduledHours = schedule?.hours || 0;

          const validation = OvertimeValidationService.validate(
            scheduledHours,
            proposedEntrada,
            proposedSalida,
            isArticle22,
          );

          if (!validation.valid) {
            throw new AppError(
              validation.message || "La corrección excede el límite legal de horas extras.",
              400,
              "OVERTIME_LIMIT_EXCEEDED",
            );
          }
        }
      }

      if (record) {
        await TimeRecordService.validateEditableRecord({
          employeeId: record.employeeId,
          employeeWorkdayType: record.employeeWorkdayType,
          date: record.date,
          entrada: data.recordField === "entrada" ? data.requestedValue : record.entrada,
          inicioColacion:
            data.recordField === "inicioColacion" ? data.requestedValue : record.inicioColacion,
          finColacion:
            data.recordField === "finColacion" ? data.requestedValue : record.finColacion,
          salida: data.recordField === "salida" ? data.requestedValue : record.salida,
        });
      }
    }

    const result = await withDirectTransaction(async (tx) => {
      // Orden: cierre, empleado y finalmente fila. Los demás escritores de
      // jornada toman el mismo candado de empleado antes de sellar la cadena.
      await lockAccounting(tx);
      await lockEmployeeRecords(tx, record.employeeId);
      await tx.$queryRaw`SELECT id FROM time_records WHERE id = ${record.id} FOR UPDATE`;
      const locked = await tx.timeRecord.findUnique({ where: { id: record.id } });
      if (!locked || locked.isDeleted)
        throw new AppError("Registro de tiempo no encontrado.", 404, "TIME_RECORD_NOT_FOUND");
      if (locked.employeeId !== data.employeeId)
        throw new AppError("La jornada no pertenece al empleado indicado.", 403, "FORBIDDEN");
      if (await TimeRecordService.isRecordLocked(locked.date, tx))
        throw new AppError("El período está cerrado.", 403, "RECORD_LOCKED");
      const field = data.recordField as CorrectableRecordField;
      const existing = await tx.correctionRequest.findFirst({
        where: { timeRecordId: locked.id, recordField: field, status: "pending", isDeleted: false },
      });
      if (existing)
        throw new AppError(
          "Ya existe una solicitud pendiente para esta jornada y campo.",
          409,
          "CORRECTION_PENDING",
        );
      await TimeRecordService.validateEditableRecord({
        employeeId: locked.employeeId,
        employeeWorkdayType: locked.employeeWorkdayType,
        date: locked.date,
        entrada: field === "entrada" ? data.requestedValue : locked.entrada,
        inicioColacion: field === "inicioColacion" ? data.requestedValue : locked.inicioColacion,
        finColacion: field === "finColacion" ? data.requestedValue : locked.finColacion,
        salida: field === "salida" ? data.requestedValue : locked.salida,
      });
      const request = await tx.correctionRequest.create({
        data: {
          id: data.id,
          employeeId: data.employeeId,
          timeRecordId: locked.id,
          recordField: field,
          originalValue: locked[field] || "",
          requestedValue: data.requestedValue || "",
          reason: data.reason,
        },
      });
      const audit = await writeAudit(tx, {
        actorUsername: user.username || "SYSTEM",
        action: "CORRECTION_REQUEST_CREATED",
        category: "CTRL_HOURS",
        details: {
          requestId: request.id,
          employeeId: request.employeeId,
          timeRecordId: request.timeRecordId,
          recordField: request.recordField,
          status: request.status,
        },
      });
      return { request, audit };
    }, ACCOUNTING_TRANSACTION_OPTIONS);
    const { request } = result;
    SocketService.emit("correctionRequest:created", {
      ...request,
      lastModified: request.updatedAt.getTime(),
      syncStatus: "synced",
      isDeleted: false,
    });
    SocketService.emitToAll("auditLog:created", result.audit);

    return request;
  }

  /**
   * Updates correction request status with idempotency protection.
   */
  static async updateStatus(
    id: string,
    updateData: {
      status: string;
      resolvedBy?: string;
      rejectionReason?: string;
      actorUsername?: string;
      actorRole?: string;
    },
  ) {
    const { status, resolvedBy, rejectionReason, actorUsername, actorRole } = updateData;

    const currentRequest = await prisma.correctionRequest.findUnique({
      where: { id },
    });

    if (!currentRequest) {
      throw new Error("NOT_FOUND");
    }

    // Idempotency: Return early if already processed
    if (currentRequest.status !== "pending") {
      return currentRequest;
    }

    if (status === "rejected" && !rejectionReason?.trim()) {
      throw new AppError(
        "El motivo de rechazo es obligatorio cuando la solicitud es rechazada.",
        400,
        "REJECTION_REASON_REQUIRED",
      );
    }

    // No aprobar valores futuros creados antes del guard (spec 030).
    if (status === "approved" && new Date(currentRequest.requestedValue).getTime() > Date.now()) {
      throw new AppError(
        "No se puede aprobar una corrección con fecha futura.",
        400,
        "FUTURE_CORRECTION",
      );
    }

    const now = new Date();
    const result = await withDirectTransaction(async (tx) => {
      await lockAccounting(tx);
      await lockEmployeeRecords(tx, currentRequest.employeeId);
      await tx.$queryRaw`SELECT id FROM time_records WHERE id = ${currentRequest.timeRecordId} FOR UPDATE`;
      // Anti-carrera (2026-10-04): el guard de idempotencia se lee FUERA de
      // la tx, así que N approves concurrentes lo pasan todos y parchaban el
      // record N veces con N auditorías. El update condicional deja pasar a
      // uno solo; el resto retorna el estado ya resuelto (200, sin error).
      const claimed = await tx.correctionRequest.updateMany({
        where: { id, status: "pending" },
        data: {
          status,
          resolvedBy,
          rejectionReason,
          resolvedAt: now,
        },
      });
      if (claimed.count === 0) {
        const settled = await tx.correctionRequest.findUnique({ where: { id } });
        if (!settled) throw new Error("NOT_FOUND");
        return {
          updatedRequest: settled,
          updatedTimeRecord: null,
          alreadySettled: true,
          audits: [],
        };
      }
      const updatedRequest = await tx.correctionRequest.findUnique({
        where: { id },
      });
      if (!updatedRequest) throw new Error("NOT_FOUND");

      let updatedTimeRecord: TimeRecord | null = null;
      const audits: Awaited<ReturnType<typeof writeAudit>>[] = [];

      if (status === "approved") {
        const validFields: CorrectableRecordField[] = [
          "entrada",
          "inicioColacion",
          "finColacion",
          "salida",
        ];
        if (!validFields.includes(currentRequest.recordField as CorrectableRecordField)) {
          throw new AppError("Campo de corrección inválido.", 400, "INVALID_CORRECTION_FIELD");
        }

        const recordField = currentRequest.recordField as CorrectableRecordField;

        const currentTimeRecord = await tx.timeRecord.findUnique({
          where: { id: currentRequest.timeRecordId },
        });

        if (!currentTimeRecord || currentTimeRecord.isDeleted) {
          throw new AppError("Registro de tiempo no encontrado.", 404, "TIME_RECORD_NOT_FOUND");
        }

        if (currentTimeRecord.employeeId !== currentRequest.employeeId) {
          throw new AppError("La jornada no pertenece al empleado indicado.", 403, "FORBIDDEN");
        }

        if (await TimeRecordService.isRecordLocked(currentTimeRecord.date, tx)) {
          throw new AppError("El período está cerrado.", 403, "RECORD_LOCKED");
        }
        if (!sameValue(currentTimeRecord[recordField], currentRequest.originalValue)) {
          throw new AppError(
            "El campo cambió desde la solicitud; debe crear una nueva.",
            409,
            "CORRECTION_STALE",
          );
        }

        const patch: Record<string, string> = {
          [recordField]: currentRequest.requestedValue,
        };

        await TimeRecordService.validateEditableRecord({
          employeeId: currentTimeRecord.employeeId,
          employeeWorkdayType: currentTimeRecord.employeeWorkdayType,
          date: currentTimeRecord.date,
          entrada:
            recordField === "entrada" ? currentRequest.requestedValue : currentTimeRecord.entrada,
          inicioColacion:
            recordField === "inicioColacion"
              ? currentRequest.requestedValue
              : currentTimeRecord.inicioColacion,
          finColacion:
            recordField === "finColacion"
              ? currentRequest.requestedValue
              : currentTimeRecord.finColacion,
          salida:
            recordField === "salida" ? currentRequest.requestedValue : currentTimeRecord.salida,
        });

        // Auto-heal anomaly status if core marks are now complete.
        const nextEntrada =
          recordField === "entrada" ? currentRequest.requestedValue : currentTimeRecord.entrada;
        const nextSalida =
          recordField === "salida" ? currentRequest.requestedValue : currentTimeRecord.salida;

        if (
          (currentTimeRecord.status === "AnomaliaManual" ||
            currentTimeRecord.status === "SinMarcajeTurnoAsignado") &&
          nextEntrada &&
          nextSalida &&
          nextEntrada !== "SIN REGISTRO" &&
          nextSalida !== "SIN REGISTRO"
        ) {
          patch.status = "Completado";
        }

        updatedTimeRecord = await tx.timeRecord.update({
          where: { id: currentRequest.timeRecordId },
          data: patch,
        });

        await timeRecordIntegrityService.sealAfterMutation(
          tx,
          currentRequest.employeeId,
          currentRequest.timeRecordId,
        );

        audits.push(
          await writeAudit(tx, {
            actorUsername: actorUsername || resolvedBy || "SYSTEM",
            action: "TIME_RECORD_EDITED",
            category: "CTRL_HOURS",
            severity: "WARNING",
            outcome: "SUCCESS",
            details: {
              recordId: currentRequest.timeRecordId,
              correctionRequestId: currentRequest.id,
              fieldEdited: recordField,
              oldValue: {
                [recordField]: currentTimeRecord[recordField] ?? null,
              },
              newValue: {
                [recordField]: currentRequest.requestedValue,
              },
            },
          }),
        );
      }

      audits.push(
        await writeAudit(tx, {
          actorUsername: actorUsername || resolvedBy || "SYSTEM",
          action: "CORRECTION_REQUEST_STATUS_UPDATED",
          category: "CTRL_HOURS",
          severity: status === "rejected" ? "WARNING" : "INFO",
          outcome: "SUCCESS",
          details: {
            requestId: updatedRequest.id,
            employeeId: updatedRequest.employeeId,
            timeRecordId: updatedRequest.timeRecordId,
            recordField: updatedRequest.recordField,
            requestedValue: updatedRequest.requestedValue,
            previousStatus: currentRequest.status,
            newStatus: updatedRequest.status,
            rejectionReason: updatedRequest.rejectionReason || null,
          },
          metadata: { actorRole: actorRole || null },
        }),
      );
      return { updatedRequest, updatedTimeRecord, alreadySettled: false, audits };
    }, ACCOUNTING_TRANSACTION_OPTIONS);
    const request = result.updatedRequest;

    // El perdedor de la carrera no re-emite ni re-audita: el ganador ya lo hizo.
    if (result.alreadySettled) return request;

    const enrichedRequest = {
      ...request,
      lastModified: request.updatedAt.getTime(),
      syncStatus: "synced",
      isDeleted: false,
    };
    SocketService.emit("correctionRequest:updated", enrichedRequest);
    if (result.updatedTimeRecord) {
      SocketService.emit("timeRecord:updated", {
        ...result.updatedTimeRecord,
        entradaTimestamp: result.updatedTimeRecord.entrada
          ? new Date(result.updatedTimeRecord.entrada).getTime()
          : null,
        inicioColacionTimestamp: result.updatedTimeRecord.inicioColacion
          ? new Date(result.updatedTimeRecord.inicioColacion).getTime()
          : null,
        finColacionTimestamp: result.updatedTimeRecord.finColacion
          ? new Date(result.updatedTimeRecord.finColacion).getTime()
          : null,
        salidaTimestamp: result.updatedTimeRecord.salida
          ? new Date(result.updatedTimeRecord.salida).getTime()
          : null,
      });
    }
    for (const audit of result.audits) SocketService.emitToAll("auditLog:created", audit);

    return request;
  }

  /**
   * Gets statistics for correction requests.
   * Total pending, and approved/rejected in the last 30 days.
   */
  static async getStats(user: { role: string; employeeId?: string }) {
    requireLinkedEmployee(user);
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const baseWhere: Prisma.CorrectionRequestWhereInput = { isDeleted: false };
    if (isSelfOnly(user) && user.employeeId) {
      baseWhere.employeeId = user.employeeId;
    }

    const [pending, approved, rejected] = await Promise.all([
      prisma.correctionRequest.count({
        where: { ...baseWhere, status: "pending" },
      }),
      prisma.correctionRequest.count({
        where: {
          ...baseWhere,
          status: "approved",
          resolvedAt: { gte: last30Days },
        },
      }),
      prisma.correctionRequest.count({
        where: {
          ...baseWhere,
          status: "rejected",
          resolvedAt: { gte: last30Days },
        },
      }),
    ]);

    return { pending, approved, rejected };
  }

  /**
   * Gets the event history for one correction request.
   * Uses audit logs as source of truth for timeline entries.
   */
  static async getHistory(id: string, user: { role: string; employeeId?: string }) {
    requireLinkedEmployee(user);
    const request = await prisma.correctionRequest.findUnique({ where: { id } });

    if (!request) {
      throw new Error("NOT_FOUND");
    }

    if (isSelfOnly(user) && user.employeeId && request.employeeId !== user.employeeId) {
      throw new AppError("Acceso denegado a historial de corrección", 403, "FORBIDDEN");
    }

    const logs = await prisma.auditLog.findMany({
      where: {
        action: {
          in: ["CORRECTION_REQUEST_CREATED", "CORRECTION_REQUEST_STATUS_UPDATED"],
        },
        details: {
          path: ["requestId"],
          equals: id,
        },
      },
      orderBy: { timestamp: "asc" },
    });

    const events = logs.map((log) => {
      const details = (log.details || {}) as Record<string, unknown>;
      return {
        id: log.id,
        timestamp: log.timestamp,
        actorUsername: log.actorUsername || "SYSTEM",
        action: log.action,
        category: log.category || "CTRL_HOURS",
        details,
      };
    });

    if (events.length === 0) {
      const fallbackEvents: Array<Record<string, unknown>> = [
        {
          id: `${request.id}-created-fallback`,
          timestamp: request.createdAt,
          actorUsername: "SYSTEM",
          action: "CORRECTION_REQUEST_CREATED",
          category: "CTRL_HOURS",
          details: {
            requestId: request.id,
            employeeId: request.employeeId,
            timeRecordId: request.timeRecordId,
            recordField: request.recordField,
            status: "pending",
            source: "fallback",
          },
        },
      ];

      if (request.status !== "pending" && request.resolvedAt) {
        fallbackEvents.push({
          id: `${request.id}-resolved-fallback`,
          timestamp: request.resolvedAt,
          actorUsername: request.resolvedBy || "SYSTEM",
          action: "CORRECTION_REQUEST_STATUS_UPDATED",
          category: "CTRL_HOURS",
          details: {
            requestId: request.id,
            employeeId: request.employeeId,
            timeRecordId: request.timeRecordId,
            previousStatus: "pending",
            newStatus: request.status,
            rejectionReason: request.rejectionReason || null,
            source: "fallback",
          },
        });
      }

      return fallbackEvents;
    }

    return events;
  }
}
