import { Request, Response, NextFunction } from "express";
import { LeaveRecordSchema } from "../models/schemas/leave.schemas";
import { LeaveService } from "../services/LeaveService";
import { asyncHandler } from "../middleware/errorHandler";
import { NotFoundError, ValidationError } from "../utils/AppError";
import { toCaughtError } from "../utils/caughtError";
import { AuthRequest } from "../middleware/authMiddleware";

/**
 * Obtiene lista de ausencias/permisos.
 */
export const getLeaves = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 50;

  const user = (req as AuthRequest).user;

  const result = await LeaveService.list(
    {
      page,
      pageSize,
      since: req.query.since as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      employeeId: req.query.employeeId as string,
      showArchived: req.query.showArchived === "true",
    },
    {
      role: user?.role || "Usuario",
      employeeId: user?.employeeId,
    },
  );

  res.json({
    success: true,
    data: result.items,
    meta: {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    },
  });
});

/**
 * Registra una nueva ausencia y materializa registros de tiempo.
 */
export const createLeave = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const validatedData = LeaveRecordSchema.parse(req.body);

    try {
      const leave = await LeaveService.upsert(validatedData);
      res.status(201).json({
        success: true,
        data: leave,
      });
    } catch (e: unknown) {
      const caught = toCaughtError(e);
      if (caught.message === "LIMIT_7_DAYS_EXCEEDED") {
        throw new ValidationError(
          "No se pueden registrar ausencias con más de 7 días de antigüedad.",
        );
      }
      if (caught.message === "CANNOT_EDIT_FINALIZED") {
        throw new ValidationError("No se pueden editar ausencias que ya han finalizado.");
      }
      if (caught.message === "IMMUTABLE_FIELDS_CHANGED") {
        throw new ValidationError("El empleado, tipo y fecha de inicio no pueden ser modificados.");
      }
      if (caught.message === "INVALID_END_DATE_PAST") {
        throw new ValidationError("La fecha de término no puede ser anterior al día de hoy.");
      }
      throw e;
    }
  },
);

/**
 * Elimina (soft-delete) una ausencia y limpia registros materializados asociados.
 */
export const deleteLeave = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const id = req.params.id as string;
    if (!id) {
      throw new ValidationError("ID inválido");
    }

    try {
      await LeaveService.delete(id);
      res.status(200).json({
        success: true,
        message: "Ausencia finalizada",
      });
    } catch (e: unknown) {
      const caught = toCaughtError(e);
      if (caught.message === "LIMIT_7_DAYS_EXCEEDED") {
        throw new ValidationError(
          "No se pueden eliminar ausencias con más de 7 días de antigüedad.",
        );
      }
      if (caught.message === "ARCHIVE_PROTECTION_VIOLATED") {
        throw new ValidationError(
          "No se pueden eliminar ausencias archivadas a menos que hayan sido creadas en las últimas 24 horas.",
        );
      }
      if (caught.message === "NOT_FOUND") {
        throw new NotFoundError("Ausencia no encontrada");
      }
      throw e;
    }
  },
);
