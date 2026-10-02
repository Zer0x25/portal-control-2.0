import { Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { shiftService } from "../services/shiftService";
import { schedulingService } from "../services/schedulingService";
import { asyncHandler } from "../middleware/errorHandler";
import { ForbiddenError, NotFoundError, ValidationError } from "../utils/AppError";
import { parseBusinessDateCL } from "../utils/timePolicy";

const isShiftValidationError = (message: string) =>
  message.includes("Conflicto") || message.includes("excesiva") || message.includes("Descanso");

/**
 * Patterns Handlers
 */
export const getShiftPatterns = asyncHandler(async (req: Request, res: Response) => {
  const since = req.query.since as string | undefined;
  const showArchived = req.query.showArchived === "true";
  const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
  const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined;
  const search = req.query.search as string | undefined;
  const patterns = await shiftService.getPatterns({ since, showArchived, page, pageSize, search });
  res.json(patterns);
});

export const createShiftPattern = asyncHandler(async (req: Request, res: Response) => {
  try {
    const pattern = await shiftService.createPattern(req.body);
    res.status(201).json(pattern);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("horario")) {
      throw new ValidationError(err.message);
    }
    throw err;
  }
});

export const updateShiftPattern = asyncHandler(async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const pattern = await shiftService.updatePattern(id, req.body);
    res.json(pattern);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("horario")) {
      throw new ValidationError(err.message);
    }
    throw err;
  }
});

export const deleteShiftPattern = asyncHandler(async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await shiftService.deletePattern(id);
    res.status(204).send();
  } catch (error) {
    const err = error as { code?: string; message: string };
    if (err.code === "P2025") {
      return res.status(204).send();
    }
    throw err;
  }
});

/**
 * Assignments Handlers
 */
export const getAssignedShifts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = req.query.page ? parseInt(req.query.page as string) : undefined;
  const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined;
  const since = req.query.since as string | undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const filterEmployeeId = req.query.employeeId as string | undefined;
  const showArchived = req.query.showArchived === "true";
  const role = req.user?.role;
  const authedEmployeeId = req.user?.employeeId;

  const result = await shiftService.getAssignments({
    page,
    pageSize,
    since,
    startDate,
    endDate,
    employeeId: role === "Usuario" ? authedEmployeeId : filterEmployeeId,
    role,
    showArchived,
  });
  res.json(result);
});

export const assignShift = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const actorUsername = req.user?.username || "System";
    const assignment = await shiftService.assignShift(req.body, actorUsername);
    res.status(201).json(assignment);
  } catch (error) {
    const err = error as Error;
    if (isShiftValidationError(err.message)) {
      throw new ValidationError(err.message);
    }
    throw err;
  }
});

export const updateAssignedShift = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const actorUsername = req.user?.username || "System";
    const assignment = await shiftService.updateAssignment(id, req.body, actorUsername);
    res.json(assignment);
  } catch (error) {
    const err = error as Error;
    if (isShiftValidationError(err.message)) {
      throw new ValidationError(err.message);
    }
    throw err;
  }
});

export const deleteAssignedShift = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const actorUsername = req.user?.username || "System";
    await shiftService.deleteAssignment(id, actorUsername);
    res.status(204).send();
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("encontrada")) {
      throw new NotFoundError(err.message);
    }
    throw err;
  }
});

/**
 * Bulk Operations
 */
export const createBulkShiftPatterns = asyncHandler(async (req: Request, res: Response) => {
  const count = await shiftService.bulkCreatePatterns(req.body);
  res.status(201).json({ count });
});

export const createBulkAssignedShifts = asyncHandler(async (req: Request, res: Response) => {
  try {
    const count = await shiftService.bulkAssignShifts(req.body);
    res.status(201).json({ count });
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("masiva")) {
      throw new ValidationError(err.message);
    }
    throw err;
  }
});

/**
 * Scheduling Logic (Delegated to schedulingService)
 */
export const getEmployeeScheduleForDate = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const dateParam = req.query.date as string | undefined;
  if (!id || !dateParam) throw new ValidationError("ID y fecha requeridos");

  const targetDate = parseBusinessDateCL(dateParam);
  const authUser = (req as AuthRequest).user;

  if (authUser?.role === "Usuario" || authUser?.role === "Kiosk_Employee") {
    if (id !== authUser.employeeId) throw new ForbiddenError("Acceso denegado");
  }

  const result = await schedulingService.getEmployeeDailyScheduleInfo(id, targetDate);
  if (!result) throw new NotFoundError("Empleado no encontrado");
  res.json(result);
});

export const getScheduledEmployeesOnDate = asyncHandler(async (req: Request, res: Response) => {
  const dateParam = req.query.date as string | undefined;
  if (!dateParam) throw new ValidationError("Fecha requerida");
  const results = await schedulingService.getScheduledEmployeesOnDate(
    parseBusinessDateCL(dateParam),
  );
  res.json(results);
});

export const getEmployeeMonthlySchedule = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const year = parseInt(req.query.year as string);
  const month = parseInt(req.query.month as string);
  if (!id || isNaN(year) || isNaN(month)) throw new ValidationError("Parámetros inválidos");

  const authUser = (req as AuthRequest).user;
  if (
    (authUser?.role === "Usuario" || authUser?.role === "Kiosk_Employee") &&
    id !== authUser.employeeId
  ) {
    throw new ForbiddenError("Acceso denegado");
  }

  const results = await schedulingService.getEmployeeScheduleForMonth(id, year, month);
  res.json(results);
});

export const getCalendarMatrix = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, employeeIds } = req.body;
  let effectiveIds = employeeIds;

  const authUser = (req as AuthRequest).user;
  if (authUser?.role === "Usuario" || authUser?.role === "Kiosk_Employee") {
    effectiveIds = [authUser.employeeId];
  }

  const matrix = await schedulingService.getCalendarMatrix(startDate, endDate, effectiveIds);
  res.json(matrix);
});

export const validateAssignmentConflicts = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, startDate, endDate, excludeAssignmentId } = req.body;
  const conflicts = await shiftService.validateConflicts(
    employeeId,
    startDate,
    endDate,
    excludeAssignmentId,
  );
  res.json({
    hasConflicts: conflicts.length > 0,
    conflicts,
    message:
      conflicts.length > 0
        ? `Se detectaron ${conflicts.length} conflicto(s).`
        : "No hay conflictos.",
  });
});
