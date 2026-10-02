import { Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { getChileDateISO } from "../utils/timeUtils";
import { queryString } from "../utils/stringUtils";
import { SocketService } from "../services/socketService";
import { requestContext } from "../utils/context";
import { auditService } from "../services/auditService";
import { TimeRecordService } from "../services/TimeRecordService";
import { PunchService } from "../services/PunchService";
import { AuthService } from "../services/AuthService";
import { asyncHandler } from "../middleware/errorHandler";
import { toCaughtError } from "../utils/caughtError";
import {
  AppError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../utils/AppError";

export const punch = asyncHandler(async (req: AuthRequest, res: Response) => {
  let { employeeId, source, forcedType, latitude, longitude } = req.body;
  const user = req.user;

  if (!user) throw new AuthError("No autorizado");

  if (user.role === "Usuario") {
    const dbUser = await AuthService.getUserById(user.id);
    if (!dbUser || !dbUser.employeeId) {
      throw new ForbiddenError("Usuario no tiene empleado asociado");
    }
    employeeId = dbUser.employeeId;
  } else if (!employeeId) {
    throw new ValidationError("Employee ID is required");
  }

  const now = new Date();
  const serverDate = getChileDateISO(now);

  if (await TimeRecordService.isRecordLocked(serverDate)) {
    throw new ForbiddenError("El periodo contable para esta fecha está cerrado.");
  }

  const lastPunch = await TimeRecordService.findLastPunch(employeeId);
  if (lastPunch && forcedType) {
    const fifteenSecondsAgo = new Date(Date.now() - 15000);
    if (lastPunch.updatedAt >= fifteenSecondsAgo) {
      throw new AppError(
        "Acción bloqueada por seguridad. Espere unos segundos.",
        429,
        "TOO_MANY_REQUESTS",
      );
    }
  }

  try {
    const result = await PunchService.handlePunch(
      req,
      employeeId,
      source,
      forcedType,
      latitude,
      longitude,
    );

    res.json({ success: true, ...result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "EMPLOYEE_NOT_FOUND") throw new NotFoundError("Empleado no encontrado");
    if (msg === "ALREADY_PUNCHED_IN") {
      throw new ValidationError("Ya existe una entrada activa para este empleado hoy.");
    }
    if (msg === "ACTION_ALREADY_TAKEN") {
      throw new ValidationError("Esta accion ya fue registrada en la jornada actual.");
    }
    if (msg === "BREAK_INCOMPLETE_TOO_EARLY") {
      throw new ValidationError(
        "No se puede marcar salida aun: la colacion incompleta debe superar 60 minutos.",
      );
    }
    throw new AppError("Error al registrar marcaje", 500, "PUNCH_ERROR");
  }
});

export const getAllRecords = asyncHandler(async (req: Request, res: Response) => {
  try {
    const result = await TimeRecordService.listRecords(req.query, (req as AuthRequest).user);
    res.json(result);
  } catch (error: unknown) {
    const caught = toCaughtError(error);
    if (caught.message === "UNAUTHORIZED_NO_EMPLOYEE") {
      throw new ForbiddenError("Usuario no tiene empleado asociado");
    }
    throw error;
  }
});

export const createOrUpdateRecord = asyncHandler(async (req: Request, res: Response) => {
  const recordData = req.body;
  if (recordData.date && (await TimeRecordService.isRecordLocked(recordData.date))) {
    throw new ForbiddenError("Periodo contable cerrado.");
  }

  const record = await requestContext.run({ ...requestContext.getStore(), skipTrigger: true }, () =>
    TimeRecordService.saveRecord(recordData, (req as AuthRequest).user?.username || "SYSTEM"),
  );

  const enriched = await TimeRecordService.enrichRecord(record);
  res.json(enriched);
  SocketService.emit("timeRecord:updated", enriched);
});

export const createBulkRecords = asyncHandler(async (req: Request, res: Response) => {
  const records = req.body;
  if (!Array.isArray(records)) throw new ValidationError("Se esperaba un array");

  const uniqueDates = Array.from(
    new Set(
      records
        .map((r: { date?: string }) => r.date)
        .filter((d): d is string => typeof d === "string" && Boolean(d.trim())),
    ),
  );

  const hasLocked = await Promise.all(
    uniqueDates.map((date) => TimeRecordService.isRecordLocked(date)),
  );
  if (hasLocked.some((l) => l)) {
    throw new ForbiddenError("El lote contiene periodos cerrados.");
  }

  const createdCount = await requestContext.run(
    { ...requestContext.getStore(), skipTrigger: true },
    () =>
      TimeRecordService.createBulkRecords(records, (req as AuthRequest).user?.username || "SYSTEM"),
  );

  res.json({ success: true, count: createdCount });
  SocketService.emit("timeRecord:batch_created", { count: createdCount });
});

export const exportMasterData = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { format = "json", employeeId, area, cargo } = req.query;
    const startDate = queryString(req.query.startDate);
    const endDate = queryString(req.query.endDate);
    if (!startDate || !endDate) {
      throw new ValidationError("Rango de fechas requerido");
    }

    const authUser = (req as AuthRequest).user;

    let effectiveEmployeeId = employeeId as string | undefined;
    if (authUser?.role === "Usuario" || authUser?.role === "Kiosk_Employee") {
      if (!authUser.employeeId) throw new ForbiddenError("No asociado a empleado");
      effectiveEmployeeId = authUser.employeeId;
    }

    auditService.log({
      actorUsername: authUser?.username || "SYSTEM",
      action: "DATA_EXPORT",
      category: "OPERATIONS",
      severity: "INFO",
      details: { format, dateRange: `${startDate} to ${endDate}` },
    });

    if (format === "csv" || format === "xml" || format === "excel") {
      const { streamExportService } = await import("../services/export/StreamExportService");
      const filters = {
        startDate,
        endDate,
        employeeId: effectiveEmployeeId,
        area: queryString(area),
        cargo: queryString(cargo),
      };

      if (format === "csv") {
        return await streamExportService.streamToCSV(res, filters);
      } else if (format === "excel") {
        return await streamExportService.streamToExcel(res, filters);
      }
      return await streamExportService.streamToXML(res, filters);
    }

    const records = await TimeRecordService.listRecordsForExport({
      startDate,
      endDate,
      employeeId: effectiveEmployeeId,
      area: queryString(area),
      cargo: queryString(cargo),
    });

    res.json(records);
  } catch (error) {
    if (!res.headersSent) {
      throw error;
    }
    res.end();
  }
});

export const deleteRecord = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const actorUsername = (req as AuthRequest).user?.username || "SYSTEM";

  try {
    await requestContext.run({ ...requestContext.getStore(), skipTrigger: true }, () =>
      TimeRecordService.deleteRecord(id, actorUsername),
    );

    res.status(204).send();
    SocketService.emit("timeRecord:deleted", { id });
  } catch (error: unknown) {
    const caught = toCaughtError(error);
    if (caught.message === "RECORD_LOCKED") {
      throw new ForbiddenError("Periodo contable cerrado.");
    }
    if (caught.message === "RECORD_NOT_FOUND") {
      throw new NotFoundError("Registro no encontrado");
    }
    throw error;
  }
});

export const triggerAutoClose = asyncHandler(async (req: Request, res: Response) => {
  const closedCount = await TimeRecordService.processAutoClosures();
  res.json({ success: true, closedCount });
});

export const verifyIntegrity = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = req.query.employeeId as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;

  const result = await TimeRecordService.verifyIntegrity({ employeeId, from, to, limit });

  res.json({
    success: true,
    summary: {
      checkedCount: result.checkedCount,
      brokenCount: result.brokenCount,
      scope: { employeeId: employeeId ?? null, from: from ?? null, to: to ?? null },
    },
    broken: result.broken,
  });
});

export const resolveAnomaly = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { resolution } = req.body;
  const actorUsername = (req as AuthRequest).user?.username || "SYSTEM";

  const record = await TimeRecordService.resolveAnomaly(id as string, resolution, actorUsername);
  res.json(record);
  SocketService.emit("timeRecord:updated", record);
});
