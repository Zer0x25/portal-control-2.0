import type { AuthRequest } from "../middleware/authMiddleware";
import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { noteFlows as flows } from "../services/noteFlows";
export const getQuickNotes = asyncHandler(async (req: Request, res: Response) => {
  res.json(await flows.list({ since: req.query.since as string }));
});
export const createQuickNote = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.status(201).json(await flows.create(req.body, req.user?.username || ""));
});
export const archiveQuickNote = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await flows.archive(req.params.id, req.user?.username || ""));
});
export const deleteQuickNote = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await flows.remove(req.params.id, req.user?.username || ""));
});
