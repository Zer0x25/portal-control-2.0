import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { systemOperationService } from "../services/systemOperationService";

const EXEMPT_PATH_PREFIXES = ["/api/health", "/api/admin", "/api/maintenance"];

export const enforceMaintenanceMode = (_req: Request, _res: Response, next: NextFunction) => {
  if (!systemOperationService.isMaintenanceModeActive()) {
    return next();
  }

  const req = _req;
  if (EXEMPT_PATH_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    return next();
  }

  const activeOperation = systemOperationService.getSnapshot();
  return next(
    new AppError(
      `Sistema temporalmente en mantenimiento por ${activeOperation?.type || "operacion critica"}. Intenta nuevamente en unos minutos.`,
      503,
      "MAINTENANCE_MODE",
    ),
  );
};
