import { Request, Response } from "express";
import { HealthService } from "../services/HealthService";
import { asyncHandler } from "../middleware/errorHandler";
import { AppError } from "../utils/AppError";

/**
 * Health check: Full metrics (Status, DB Latency, OS stats, Memory)
 */
export const health = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const healthData = await HealthService.getDetailedHealth();

  const isCriticalFailure = healthData.database.status !== "OK";
  res.status(isCriticalFailure ? 503 : 200).json({
    success: !isCriticalFailure,
    data: {
      ...healthData,
      responseTime: Date.now() - startTime,
    },
  });
});

/**
 * Readiness check: Simple DB availability probe
 */
export const readiness = asyncHandler(async (req: Request, res: Response) => {
  try {
    await HealthService.checkDbReady();
    res.status(200).json({ status: "ready" });
  } catch {
    throw new AppError("Database unreachable", 503, "NOT_READY");
  }
});
