import prisma, { withDirectTransaction } from "./db";
import { SocketService } from "./socketService";
import { OvertimeValidationService } from "./OvertimeValidationService";
import { schedulingService } from "./schedulingService";
import { parseBusinessDateChile } from "../utils/timeUtils";
import { AppError } from "../utils/AppError";
import { auditService } from "./auditService";
import { TimeRecordService } from "./TimeRecordService";
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
  originalValue?: string;
  requestedValue?: string;
  reason?: string;
}

export class CorrectionService {
  /**
   * Lists correction requests with optional filtering and pagination.
   * Enforces role-based visibility rules.
   */
  static async list(params: CorrectionListParams, user: { role: string; employeeId?: string }) {
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
    if (user.role === "Usuario" && user.employeeId) {
      where.employeeId = user.employeeId;
    }

    const total = await prisma.correctionRequest.count({ where });
    const requests = await prisma.correctionRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
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
    if (user.role === "Usuario") {
      const userEmpId = user.employeeId?.toString();
      const dataEmpId = data.employeeId?.toString();

      if (!userEmpId || dataEmpId !== userEmpId) {
        throw new Error("FORBIDDEN_OWNERSHIP");
      }
    }

    // 2. Overtime Validation: Check legal limits if altering core times
    if (
      data.recordField === "entrada" ||
      data.recordField === "inicioColacion" ||
      data.recordField === "finColacion" ||
      data.recordField === "salida"
    ) {
      const record = await prisma.timeRecord.findUnique({ where: { id: data.timeRecordId } });
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
            if (shiftHours > 12) {
              throw new AppError(
                "La salida no puede superar 12 horas desde la entrada.",
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

    // 3. Persistence
    const request = await prisma.correctionRequest.create({
      data: {
        id: data.id,
        employeeId: data.employeeId,
        timeRecordId: data.timeRecordId,
        recordField: data.recordField,
        originalValue: data.originalValue || "",
        requestedValue: data.requestedValue || "",
        reason: data.reason,
      },
    });

    // 4. Notification
    const enrichedRequest = {
      ...request,
      lastModified: request.updatedAt.getTime(),
      syncStatus: "synced",
      isDeleted: false,
    };
    SocketService.emit("correctionRequest:created", enrichedRequest);
    await auditService.log({
      actorUsername: user.username || "SYSTEM",
      action: "CORRECTION_REQUEST_CREATED",
      category: "CTRL_HOURS",
      severity: "INFO",
      outcome: "SUCCESS",
      details: {
        requestId: request.id,
        employeeId: request.employeeId,
        timeRecordId: request.timeRecordId,
        recordField: request.recordField,
        status: request.status,
      },
    });

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

    const now = new Date();
    const result = await withDirectTransaction(async (tx) => {
      const updatedRequest = await tx.correctionRequest.update({
        where: { id },
        data: {
          status,
          resolvedBy,
          rejectionReason,
          resolvedAt: now,
        },
      });

      let updatedTimeRecord: TimeRecord | null = null;

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

        if (!currentTimeRecord) {
          throw new AppError("Registro de tiempo no encontrado.", 404, "TIME_RECORD_NOT_FOUND");
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

        await auditService.log({
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
        });
      }

      return { updatedRequest, updatedTimeRecord };
    });
    const request = result.updatedRequest;

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
    await auditService.log({
      actorUsername: actorUsername || resolvedBy || "SYSTEM",
      action: "CORRECTION_REQUEST_STATUS_UPDATED",
      category: "CTRL_HOURS",
      severity: status === "rejected" ? "WARNING" : "INFO",
      outcome: "SUCCESS",
      details: {
        requestId: request.id,
        employeeId: request.employeeId,
        timeRecordId: request.timeRecordId,
        recordField: request.recordField,
        requestedValue: request.requestedValue,
        previousStatus: currentRequest.status,
        newStatus: request.status,
        rejectionReason: request.rejectionReason || null,
      },
      metadata: {
        actorRole: actorRole || null,
      },
    });

    return request;
  }

  /**
   * Gets statistics for correction requests.
   * Total pending, and approved/rejected in the last 30 days.
   */
  static async getStats(user: { role: string; employeeId?: string }) {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const baseWhere: Prisma.CorrectionRequestWhereInput = { isDeleted: false };
    if (user.role === "Usuario" && user.employeeId) {
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
    const request = await prisma.correctionRequest.findUnique({ where: { id } });

    if (!request) {
      throw new Error("NOT_FOUND");
    }

    if (user.role === "Usuario" && user.employeeId && request.employeeId !== user.employeeId) {
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
