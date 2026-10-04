import { Request, Response, NextFunction } from "express";
import {
  AppError,
  AuthError,
  ForbiddenError,
  DatabaseError,
  ValidationError,
} from "../utils/AppError";
import { Prisma } from "../generated/prisma/client";
import multer from "multer";
import { auditService } from "../services/auditService";
import { toCaughtError } from "../utils/caughtError";

/**
 * Reads Prisma's `meta.target` (the conflicting column(s)) without casting the
 * whole error, since `meta` only exists on `PrismaClientKnownRequestError`.
 */
const readConflictTarget = (error: unknown): string | undefined => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return undefined;
  const target = error.meta?.target;
  return Array.isArray(target) ? String(target[0]) : undefined;
};

/**
 * Flattens a thrown `ZodError` into `{ field, message }` pairs. Zod only
 * guarantees `issues` at runtime, so the shape is checked before reading it.
 */
const readZodIssues = (error: unknown): { field: string; message: string }[] | undefined => {
  if (!error || typeof error !== "object" || !("issues" in error)) return undefined;
  const { issues } = error as { issues?: unknown };
  if (!Array.isArray(issues)) return undefined;

  return issues.map((issue) => {
    const candidate = issue as { path?: unknown; message?: unknown };
    const path = Array.isArray(candidate.path) ? candidate.path.join(".") : "";
    return { field: path, message: typeof candidate.message === "string" ? candidate.message : "" };
  });
};

/**
 * Centralized error handler middleware
 */
export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const caught = toCaughtError(err);
  const errName = err instanceof Error ? err.name : "Error";
  const statusCode =
    err instanceof AppError ? err.statusCode : Number(caught.statusCode ?? 0) || 500;
  const isDevelopment = process.env.NODE_ENV === "development";

  // Determine error category for auditing
  let category = "SYSTEM_ERROR";
  if (
    err instanceof AuthError ||
    errName === "JsonWebTokenError" ||
    errName === "TokenExpiredError"
  ) {
    category = "AUTH_ERROR";
  } else if (err instanceof ForbiddenError) {
    category = "FORBIDDEN_ERROR";
  } else if (err instanceof ValidationError || errName === "ZodError") {
    category = "VALIDATION_ERROR";
  } else if (err instanceof DatabaseError || err instanceof Prisma.PrismaClientKnownRequestError) {
    category = "DATABASE_ERROR";
  }

  // Log the error centrally (to Console and AuditLog table)
  console.error(`[${category}]`, {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    name: errName,
    code: caught.code,
    message: caught.message,
    statusCode,
  });

  // Track critical/unexpected errors in DB AuditLog
  // Non-operational errors or 500s are automatically logged
  if (!(err instanceof AppError ? err.isOperational : false) || statusCode >= 500) {
    auditService.logError(err, req, category).catch((logErr) => {
      console.error("Critical failure: Could not log error to AuditService", logErr);
    });
  }

  // Handle AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      code: caught.code,
      message: caught.message,
      ...(err instanceof ValidationError && { errors: err.errors }),
    });
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (caught.code === "P2025") {
      return res.status(404).json({
        success: false,
        code: "NOT_FOUND",
        message: "El recurso solicitado no existe",
      });
    }

    if (caught.code === "P2002") {
      const field = readConflictTarget(err) || "unknown";
      return res.status(409).json({
        success: false,
        code: "CONFLICT",
        message: `Ya existe un registro con este ${field}`,
      });
    }

    if (caught.code === "P2003") {
      return res.status(400).json({
        success: false,
        code: "FOREIGN_KEY_ERROR",
        message: "Referencia inválida a otro registro",
      });
    }

    // Caos PgBouncer (2026-10-04): BD inalcanzable/timeout no es un 500
    // genérico — es 503 para que gateway, reintentos y monitores actúen.
    if (caught.code === "P1001" || caught.code === "P1002" || caught.code === "P2024") {
      return res.status(503).json({
        success: false,
        code: "SERVICE_UNAVAILABLE",
        message: "Base de datos temporalmente no disponible",
      });
    }

    return res.status(500).json({
      success: false,
      code: "DATABASE_ERROR",
      message: "Error en la base de datos",
    });
  }

  // Handle JWT errors
  if (errName === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      code: "INVALID_TOKEN",
      message: "Token inválido o malformado",
    });
  }

  if (errName === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      code: "TOKEN_EXPIRED",
      message: "Token expirado",
    });
  }

  // Handle Zod validation errors (runtime contracts)
  if (errName === "ZodError") {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Error de validación",
      errors: readZodIssues(err),
    });
  }

  // Handle Multer upload errors (spec 002 H-02): file too large -> 413.
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        code: "FILE_TOO_LARGE",
        message: "El archivo excede el tamaño máximo permitido",
      });
    }
    return res.status(400).json({
      success: false,
      code: "UPLOAD_ERROR",
      message: "Error al procesar el archivo",
    });
  }

  // Default fallback for any other errors
  res.status(statusCode).json({
    success: false,
    code: caught.code || "INTERNAL_ERROR",
    message: caught.message || "Error interno del servidor",
    ...(isDevelopment && { stack: err instanceof Error ? err.stack : undefined }),
  });
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
