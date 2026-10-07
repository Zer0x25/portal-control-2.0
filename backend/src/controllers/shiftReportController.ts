import type { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import type { ShiftReportQuery } from "../modules/shiftReports";
import { shiftReportFlows } from "../services/shiftReportFlows";
import { asyncHandler } from "../middleware/errorHandler";
import { AppError } from "../utils/AppError";
export const getAllShiftReports = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await shiftReportFlows.list(req.query as ShiftReportQuery));
});
export const createOrUpdateShiftReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await shiftReportFlows.save(req.body, req.user?.username || "SYSTEM"));
});
export const exportShiftReportExcel = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { streamExportService } = await import("../services/export/StreamExportService");
    await streamExportService.streamShiftReportToExcel(
      res,
      typeof req.params.id === "string" ? req.params.id : "",
    );
  } catch {
    if (!res.headersSent)
      throw new AppError("Error al exportar reporte de turno", 500, "SHIFT_REPORT_EXPORT_ERROR");
    else res.end();
  }
});
