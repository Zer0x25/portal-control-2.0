import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { maintenanceFlows } from "../services/maintenanceFlows";
import { asyncHandler } from "../middleware/errorHandler";
import { jsonProgressOutput } from "../utils/jsonProgress";
export const seedDatabase = asyncHandler(async (req: AuthRequest, res: Response) => {
  await maintenanceFlows.seed(req.body, req.user || {}, jsonProgressOutput(res));
});
export const seedPhase1 = seedDatabase;
export const startSeedPhase2 = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await maintenanceFlows.startJob(req.body || {}, req.user || {}));
});
export const pauseSeedPhase2 = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await maintenanceFlows.pauseJob(req.body));
});
export const resumeSeedPhase2 = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await maintenanceFlows.resumeJob(req.body));
});
export const stopSeedPhase2 = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await maintenanceFlows.stopJob(req.body));
});
export const getSeedPhase2Status = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await maintenanceFlows.status(req.query as { jobId?: string }));
});
export const getSeedPhase2Logs = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await maintenanceFlows.logs(req.query as { jobId?: string; limit?: string }));
});
