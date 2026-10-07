import type { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import type { LeaveQuery } from "../modules/leaves";
import { LeaveRecordSchema } from "../models/schemas/leave.schemas";
import { leaveFlows } from "../services/leaveFlows";
import { asyncHandler } from "../middleware/errorHandler";
export const getLeaves = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await leaveFlows.list(req.query as LeaveQuery, req.user));
});
export const createLeave = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.status(201).json(await leaveFlows.upsert(LeaveRecordSchema.parse(req.body)));
});
export const deleteLeave = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await leaveFlows.delete(typeof req.params.id === "string" ? req.params.id : ""));
});
