import type { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import type { ShiftQuery } from "../modules/shifts";
import { shiftFlows } from "../services/shiftFlows";
import { asyncHandler } from "../middleware/errorHandler";
const query = (req: AuthRequest) => req.query as ShiftQuery;
const id = (req: AuthRequest) => (typeof req.params.id === "string" ? req.params.id : "");
const actor = (req: AuthRequest) => req.user?.username || "System";
export const getShiftPatterns = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await shiftFlows.patterns(query(req)));
});
export const createShiftPattern = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.status(201).json(await shiftFlows.createPattern(req.body));
});
export const updateShiftPattern = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await shiftFlows.updatePattern(id(req), req.body));
});
export const deleteShiftPattern = asyncHandler(async (req: AuthRequest, res: Response) => {
  await shiftFlows.deletePattern(id(req));
  res.status(204).send();
});
export const getAssignedShifts = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await shiftFlows.assignments(query(req), req.user));
});
export const assignShift = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.status(201).json(await shiftFlows.assign(req.body, actor(req)));
});
export const updateAssignedShift = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await shiftFlows.updateAssignment(id(req), req.body, actor(req)));
});
export const deleteAssignedShift = asyncHandler(async (req: AuthRequest, res: Response) => {
  await shiftFlows.deleteAssignment(id(req), actor(req));
  res.status(204).send();
});
export const createBulkShiftPatterns = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.status(201).json(await shiftFlows.bulkPatterns(req.body));
});
export const createBulkAssignedShifts = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.status(201).json(await shiftFlows.bulkAssignments(req.body));
});
export const getEmployeeScheduleForDate = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await shiftFlows.daily(id(req), query(req), req.user));
});
export const getScheduledEmployeesOnDate = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await shiftFlows.scheduled(query(req)));
});
export const getEmployeeMonthlySchedule = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await shiftFlows.month(id(req), query(req), req.user));
});
export const getCalendarMatrix = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await shiftFlows.matrix(req.body, req.user));
});
export const validateAssignmentConflicts = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await shiftFlows.conflicts(req.body));
});
