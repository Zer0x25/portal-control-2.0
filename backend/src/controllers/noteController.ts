import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { noteFlows as flows } from "../services/noteFlows";
export const getQuickNotes = asyncHandler(async (req: Request, res: Response) => {
  res.json(await flows.list({ since: req.query.since as string }));
});
export const createQuickNote = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await flows.create(req.body));
});
export const archiveQuickNote = asyncHandler(async (req: Request, res: Response) => {
  res.json(await flows.archive(req.params.id));
});
export const deleteQuickNote = asyncHandler(async (req: Request, res: Response) => {
  res.json(await flows.remove(req.params.id));
});
