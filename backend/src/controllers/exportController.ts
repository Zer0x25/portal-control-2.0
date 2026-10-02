import { Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { z } from "zod";
import { ExportService } from "../services/export/ExportService";
import { asyncHandler } from "../middleware/errorHandler";
import { AppError, ForbiddenError, ValidationError } from "../utils/AppError";

const exportService = new ExportService();

// Schema Validation for Export Filters
const ExportQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  area: z.string().optional(),
  cargo: z.string().optional(),
  employeeId: z.string().optional(),
  viewMode: z.enum(["month", "week", "day"]).default("month"),
  mode: z.enum(["summary", "compiled_detailed"]).optional(), // New parameter
});

/**
 * Export Shift Calendar to PDF
 */
export const exportCalendarPDF = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Validate Query Params
  const validation = ExportQuerySchema.safeParse(req.query);

  if (!validation.success) {
    throw new ValidationError("Parámetros de exportación inválidos", [validation.error.format()]);
  }

  const filters = validation.data;

  // Security check for 'Usuario' role
  if (req.user?.role === "Usuario") {
    if (!filters.employeeId || filters.employeeId !== req.user.employeeId) {
      throw new ForbiddenError("Acceso denegado: Solo puede exportar su propio calendario");
    }
    // Restrict filters for individual workers
    filters.area = undefined;
    filters.cargo = undefined;
  }

  // Generate PDF
  const pdfBuffer = await exportService.generateReportPDF("calendar", {
    startDate: filters.startDate,
    endDate: filters.endDate,
    area: filters.area,
    cargo: filters.cargo,
    employeeId: filters.employeeId,
    viewMode: filters.viewMode as "month" | "week" | "day",
  });

  // Set headers for download
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=Calendario_Turnos_${filters.startDate}_${filters.endDate}.pdf`,
  );
  res.setHeader("Content-Length", pdfBuffer.length);

  res.send(pdfBuffer);
});

/**
 * Export Detailed Report to PDF
 */
export const exportReportPDF = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Validate Query Params
  const validation = ExportQuerySchema.safeParse(req.query);

  if (!validation.success) {
    throw new ValidationError("Parámetros de exportación inválidos", [validation.error.format()]);
  }

  const filters = validation.data;

  // Security check for 'Usuario' role
  if (req.user?.role === "Usuario") {
    if (!filters.employeeId || filters.employeeId !== req.user.employeeId) {
      return res.status(403).json({
        message: "Acceso denegado: Solo puede exportar su propio reporte de asistencia",
      });
    }
    // Restrict filters and modes for individual workers
    filters.area = undefined;
    filters.cargo = undefined;
    filters.mode = undefined;
  }

  // Generate PDF
  const pdfBuffer = await exportService.generateReportPDF("detailed", {
    startDate: filters.startDate,
    endDate: filters.endDate,
    area: filters.area,
    cargo: filters.cargo,
    employeeId: filters.employeeId,
    viewMode: filters.viewMode as "month" | "week" | "day",
    mode: filters.mode as "summary" | "compiled_detailed",
  });

  // Set headers for download
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=Reporte_Asistencia_${filters.startDate}_to_${filters.endDate}.pdf`,
  );
  res.setHeader("Content-Length", pdfBuffer.length);

  res.send(pdfBuffer);
});

/**
 * Export a Single Shift Report (Logbook) to PDF
 */
export const exportShiftReportPDF = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new ValidationError("ID de reporte requerido");
  }

  // Generate PDF
  const pdfBuffer = await exportService.generateReportPDF("shift_report", {
    shiftReportId: id as string,
  });

  // Set headers for download
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=Reporte_Turno_${id}.pdf`);
  res.setHeader("Content-Length", pdfBuffer.length);

  res.send(pdfBuffer);
});

/**
 * Export Attendance Report to Excel
 */
export const exportReportExcel = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const validation = ExportQuerySchema.safeParse(req.query);
    if (!validation.success) {
      throw new ValidationError("Parámetros de exportación inválidos", [validation.error.format()]);
    }

    const filters = validation.data;

    // Security check for 'Usuario' role
    if (req.user?.role === "Usuario") {
      if (!filters.employeeId || filters.employeeId !== req.user.employeeId) {
        throw new ForbiddenError("Acceso denegado: Solo puede exportar su propio reporte");
      }
    }

    const { streamExportService } = await import("../services/export/StreamExportService");
    await streamExportService.streamKpiReportToExcel(res, {
      startDate: filters.startDate,
      endDate: filters.endDate,
      employeeId: filters.employeeId,
      area: filters.area,
      mode: filters.mode as "summary" | "detailed" | undefined,
    });
  } catch {
    if (!res.headersSent) {
      throw new AppError("Error al exportar reporte a Excel", 500, "EXPORT_REPORT_EXCEL_ERROR");
    } else {
      res.end();
    }
  }
});
