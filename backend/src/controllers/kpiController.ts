import { Request, Response } from "express";
import { kpiService } from "../services/kpiService";
import { asyncHandler } from "../middleware/errorHandler";
import { ValidationError } from "../utils/AppError";
import {
  businessDateToUtcDate,
  compareBusinessDateCL,
  fromInclusiveRange,
} from "../utils/timePolicy";

const validateDateRange = (
  start: string,
  endExclusive: string,
  employeeIds?: string[],
): { valid: boolean; message?: string } => {
  if (compareBusinessDateCL(start, endExclusive) >= 0) {
    return {
      valid: false,
      message: "La fecha de inicio debe ser anterior a la fecha de término",
    };
  }

  const startDate = businessDateToUtcDate(start);
  const endExclusiveDate = businessDateToUtcDate(endExclusive);
  const diffInMs = endExclusiveDate.getTime() - startDate.getTime();
  const maxRangeYears = employeeIds && employeeIds.length === 1 ? 5 : 1;
  const maxRangeInMs = maxRangeYears * 365.25 * 24 * 60 * 60 * 1000;

  if (diffInMs > maxRangeInMs) {
    return {
      valid: false,
      message: `El rango de fechas no puede exceder ${maxRangeYears} ${
        maxRangeYears === 1 ? "año" : "años"
      } para proteger el rendimiento`,
    };
  }

  return { valid: true };
};

export const getKpiSummary = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, endDateExclusive, employeeIds, area } = req.body;

  if (!startDate || (!endDate && !endDateExclusive)) {
    throw new ValidationError("startDate and (endDate or endDateExclusive) are required");
  }

  const effectiveEndExclusive =
    endDateExclusive ||
    fromInclusiveRange({ startDate, endDate: endDate as string }).endDateExclusive;
  const validation = validateDateRange(startDate, effectiveEndExclusive, employeeIds);
  if (!validation.valid) {
    throw new ValidationError(validation.message || "Invalid date range");
  }

  const stats = await kpiService.getKpiSummary({
    startDate,
    endDateExclusive: effectiveEndExclusive,
    endDate,
    employeeIds,
    area,
  });

  res.json(stats);
});

export const getDashboardOverview = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await kpiService.getDashboardOverview();
  res.json(stats);
});

export const getDailyPlanningSummary = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await kpiService.getDailyPlanningSummary();
  res.json(stats);
});

export const getDetailedReport = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, endDateExclusive, employeeIds, area } = req.body;

  if (!startDate || (!endDate && !endDateExclusive)) {
    throw new ValidationError("startDate and (endDate or endDateExclusive) are required");
  }

  const effectiveEndExclusive =
    endDateExclusive ||
    fromInclusiveRange({ startDate, endDate: endDate as string }).endDateExclusive;
  const validation = validateDateRange(startDate, effectiveEndExclusive, employeeIds);
  if (!validation.valid) {
    throw new ValidationError(validation.message || "Invalid date range");
  }

  const report = await kpiService.getDetailedReport({
    startDate,
    endDateExclusive: effectiveEndExclusive,
    endDate,
    employeeIds,
    area,
  });

  res.json(report);
});
