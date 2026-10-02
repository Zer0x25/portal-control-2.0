import { Request, Response } from "express";
import { ShiftReportService } from "../services/ShiftReportService";
import { AuthRequest } from "../middleware/authMiddleware";
import { asyncHandler } from "../middleware/errorHandler";
import { AppError, ConflictError } from "../utils/AppError";
import { toCaughtError } from "../utils/caughtError";

/**
 * `ShiftReportService` attaches the conflicting open shift to the thrown
 * `SHIFT_START_BLOCKED` error. It is not part of the shared `CaughtError`
 * shape, so it is read through a narrow guard instead of an `any` cast.
 */
const readConflictingShift = (
  error: unknown,
): { responsibleUser?: string | null; folio?: string | null } | undefined => {
  if (typeof error !== "object" || error === null) return undefined;
  const value = (error as { conflictingShift?: unknown }).conflictingShift;
  return typeof value === "object" && value !== null
    ? (value as { responsibleUser?: string | null; folio?: string | null })
    : undefined;
};

export const getAllShiftReports = asyncHandler(async (req: Request, res: Response) => {
  const { since, page, pageSize, status } = req.query;
  const result = await ShiftReportService.list({
    since: since as string,
    page: page as string,
    pageSize: pageSize as string,
    status: status as string,
  });

  res.json(result);
});

export const createOrUpdateShiftReport = asyncHandler(async (req: Request, res: Response) => {
  const actorUsername = (req as AuthRequest).user?.username || "SYSTEM";
  try {
    const enriched = await ShiftReportService.createOrUpdate(req.body, actorUsername);
    res.json(enriched);
  } catch (error: unknown) {
    const caught = toCaughtError(error);
    if (caught.message === "SHIFT_START_BLOCKED") {
      const conflictingShift = readConflictingShift(error);
      throw new ConflictError(
        `No se puede iniciar turno. El turno de ${conflictingShift?.responsibleUser} (Folio: ${conflictingShift?.folio}) ya está abierto.`,
      );
    }
    throw new AppError(
      "Error al guardar reporte de turno: " +
        (error instanceof Error ? error.message : "Error desconocido"),
      500,
      "SHIFT_REPORT_ERROR",
    );
  }
});

export const exportShiftReportExcel = asyncHandler(async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { streamExportService } = await import("../services/export/StreamExportService");
    await streamExportService.streamShiftReportToExcel(res, id);
  } catch {
    if (!res.headersSent) {
      throw new AppError("Error al exportar reporte de turno", 500, "SHIFT_REPORT_EXPORT_ERROR");
    } else {
      res.end();
    }
  }
});
