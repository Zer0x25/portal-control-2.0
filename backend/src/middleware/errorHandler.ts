import { Request, Response, NextFunction } from "express";
import { auditService } from "../services/auditService";
import { errorCategory, mapHttpError, shouldAuditError } from "../utils/httpError";
import { logger } from "../utils/logger";

export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const category = errorCategory(err);
  const response = mapHttpError(err, process.env.NODE_ENV === "development");
  logger.error(
    `[${category}]`,
    { code: response.body.code },
    {
      path: req.path,
      method: req.method,
      statusCode: response.statusCode,
    },
  );
  if (shouldAuditError(err)) {
    void auditService
      .logError(err, req, category)
      .catch((error) => logger.error("Could not log error to AuditService", error));
  }
  if (response.headers) res.set(response.headers);
  return res.status(response.statusCode).json(response.body);
};

/**
 * Async handler wrapper to catch unhandled promise rejections
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };

/**
 * Not found handler for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    code: "NOT_FOUND",
    message: `Ruta no encontrada: ${req.method} ${req.path}`,
  });
};
