import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { maintenanceService } from "../services/maintenanceService";
import { maintenanceFlows } from "../services/maintenanceFlows";
import { asyncHandler } from "../middleware/errorHandler";
import { jsonProgressOutput } from "../utils/jsonProgress";
export const ensureInstanceId = () => maintenanceService.ensureInstanceId();
export const clearDatabase = asyncHandler(async (req: AuthRequest, res: Response) => {
  await maintenanceFlows.clear(
    req.user ? { id: req.user.id, username: req.user.username } : undefined,
    jsonProgressOutput(res),
  );
});
