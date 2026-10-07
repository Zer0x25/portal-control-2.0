import type { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import type { CorrectionQuery } from "../modules/corrections";
import { correctionFlows } from "../services/correctionFlows";
import { asyncHandler } from "../middleware/errorHandler";
const id = (req: AuthRequest) => (typeof req.params.id === "string" ? req.params.id : "");
export const getCorrectionRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await correctionFlows.list(req.query as CorrectionQuery, req.user));
});
export const createCorrectionRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await correctionFlows.create(req.body, req.user);
  res.status(result.status).json(result.body);
});
export const updateCorrectionRequestStatus = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    res.json(await correctionFlows.updateStatus(id(req), req.body, req.user));
  },
);
export const getCorrectionStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await correctionFlows.stats(req.user));
});
export const getCorrectionRequestHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await correctionFlows.history(id(req), req.user));
});
