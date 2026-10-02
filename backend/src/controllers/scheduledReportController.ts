import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { ScheduledReportService } from "../services/ScheduledReportService";
import { asyncHandler } from "../middleware/errorHandler";
import { NotFoundError, ValidationError } from "../utils/AppError";

/**
 * Get all scheduled reports
 */
export const getScheduledReports = asyncHandler(async (req: AuthRequest, res: Response) => {
  const reports = await ScheduledReportService.list();
  res.json(reports);
});

/**
 * Get a single scheduled report by ID
 */
export const getScheduledReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const report = await ScheduledReportService.getById(id);

  if (!report) {
    throw new NotFoundError("Reporte no encontrado");
  }

  res.json(report);
});

/**
 * Create a new scheduled report
 */
export const createScheduledReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const createdBy = req.user?.username || "System";
  const { name, reportType, frequency, cronExpression, recipients } = req.body;

  if (
    !name ||
    !reportType ||
    !frequency ||
    !cronExpression ||
    !recipients ||
    recipients.length === 0
  ) {
    throw new ValidationError("Faltan campos requeridos");
  }

  const report = await ScheduledReportService.create(req.body, createdBy);
  res.status(201).json(report);
});

/**
 * Update a scheduled report
 */
export const updateScheduledReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const report = await ScheduledReportService.update(id, req.body);
  res.json(report);
});

/**
 * Delete a scheduled report
 */
export const deleteScheduledReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  await ScheduledReportService.delete(id);
  res.status(204).send();
});

/**
 * Toggle report active status
 */
export const toggleReportStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const report = await ScheduledReportService.toggleStatus(id);
  res.json(report);
});
