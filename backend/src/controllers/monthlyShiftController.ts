import type { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import type { ShiftQuery } from "../modules/shifts";
import { shiftFlows } from "../services/shiftFlows";
import { asyncHandler } from "../middleware/errorHandler";
export const getMonthlyPlan = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { employeeId, year, month } = req.params;
  res.json(await shiftFlows.monthlyPlan(String(employeeId), String(year), String(month)));
});
export const createMonthlyPlan = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await shiftFlows.saveMonthlyPlan(req.body));
});
export const getSuggestedPatternName = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await shiftFlows.suggest(req.query as ShiftQuery));
});
