import { Request, Response } from "express";
import { MonthlyShiftService } from "../services/MonthlyShiftService";
import { asyncHandler } from "../middleware/errorHandler";
import { ValidationError } from "../utils/AppError";

export const getMonthlyPlan = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, year, month } = req.params as {
    employeeId: string;
    year: string;
    month: string;
  };
  const yearNum = parseInt(year);
  const monthNum = parseInt(month);

  if (isNaN(yearNum) || isNaN(monthNum)) {
    throw new ValidationError("Invalid year or month");
  }

  const schedule = await MonthlyShiftService.getMonthlyPlan(employeeId, yearNum, monthNum);
  res.json(schedule);
});

export const createMonthlyPlan = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, month, year, dailySchedules, patternName } = req.body;

  if (!employeeId || !month || !year || !dailySchedules) {
    throw new ValidationError("Missing required fields");
  }

  await MonthlyShiftService.createMonthlyPlan({
    employeeId,
    month: parseInt(month),
    year: parseInt(year),
    dailySchedules,
    patternName,
  });
  res.json({ success: true, message: "Monthly plan updated successfully" });
});

export const getSuggestedPatternName = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, year, month } = req.query as {
    employeeId: string;
    year: string;
    month: string;
  };

  if (!employeeId || !year || !month) {
    throw new ValidationError("Missing parameters");
  }

  const suggestedName = await MonthlyShiftService.getSuggestedPatternName(employeeId, year, month);
  res.json({ suggestedName });
});
