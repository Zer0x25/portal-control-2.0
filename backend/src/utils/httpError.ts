import {
  AppError,
  AuthError,
  ForbiddenError,
  DatabaseError,
  ValidationError,
  RateLimitError,
} from "./AppError";
import { Prisma } from "../generated/prisma/client";
import multer from "multer";
import { toCaughtError } from "./caughtError";

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

export function errorCategory(error: unknown): string {
  const name = error instanceof Error ? error.name : "Error";
  if (error instanceof AuthError || ["JsonWebTokenError", "TokenExpiredError"].includes(name))
    return "AUTH_ERROR";
  if (error instanceof ForbiddenError) return "FORBIDDEN_ERROR";
  if (error instanceof ValidationError || name === "ZodError") return "VALIDATION_ERROR";
  if (error instanceof DatabaseError || error instanceof Prisma.PrismaClientKnownRequestError)
    return "DATABASE_ERROR";
  return "SYSTEM_ERROR";
}
export function shouldAuditError(error: unknown): boolean {
  return (
    !(error instanceof AppError ? error.isOperational : false) ||
    mapHttpError(error).statusCode >= 500
  );
}
export function mapHttpError(
  err: unknown,
  isDevelopment = false,
): { statusCode: number; body: Record<string, unknown>; headers?: Record<string, string> } {
  const caught = toCaughtError(err);
  const errName = err instanceof Error ? err.name : "Error";
  const statusCode =
    err instanceof AppError ? err.statusCode : Number(caught.statusCode ?? 0) || 500;
  if (caught.code === "FST_ERR_CTP_BODY_TOO_LARGE")
    return {
      statusCode: 413,
      body: {
        success: false,
        code: "PAYLOAD_TOO_LARGE",
        message: "El cuerpo excede el tamaño máximo permitido",
      },
    };
  if (caught.code === "FST_ERR_CTP_INVALID_JSON_BODY")
    return {
      statusCode: 400,
      body: { success: false, code: "INVALID_JSON", message: "JSON inválido" },
    };
  // Handle AppError instances
  if (err instanceof AppError) {
    return {
      statusCode: err.statusCode,
      ...(err instanceof RateLimitError && { headers: { "Retry-After": String(err.retryAfter) } }),
      body: {
        success: false,
        code: caught.code,
        message: caught.message,
        ...(err instanceof ValidationError && { errors: err.errors }),
      },
    };
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (caught.code === "P2025") {
      return {
        statusCode: 404,
        body: {
          success: false,
          code: "NOT_FOUND",
          message: "El recurso solicitado no existe",
        },
      };
    }

    if (caught.code === "P2002") {
      const field = readConflictTarget(err) || "unknown";
      return {
        statusCode: 409,
        body: {
          success: false,
          code: "CONFLICT",
          message: `Ya existe un registro con este ${field}`,
        },
      };
    }

    if (caught.code === "P2003") {
      return {
        statusCode: 400,
        body: {
          success: false,
          code: "FOREIGN_KEY_ERROR",
          message: "Referencia inválida a otro registro",
        },
      };
    }

    // Caos PgBouncer (2026-10-04): BD inalcanzable/timeout no es un 500
    // genérico — es 503 para que gateway, reintentos y monitores actúen.
    if (caught.code === "P1001" || caught.code === "P1002" || caught.code === "P2024") {
      return {
        statusCode: 503,
        body: {
          success: false,
          code: "SERVICE_UNAVAILABLE",
          message: "Base de datos temporalmente no disponible",
        },
      };
    }

    return {
      statusCode: 500,
      body: {
        success: false,
        code: "DATABASE_ERROR",
        message: "Error en la base de datos",
      },
    };
  }

  // Handle JWT errors
  if (errName === "JsonWebTokenError") {
    return {
      statusCode: 401,
      body: {
        success: false,
        code: "INVALID_TOKEN",
        message: "Token inválido o malformado",
      },
    };
  }

  if (errName === "TokenExpiredError") {
    return {
      statusCode: 401,
      body: {
        success: false,
        code: "TOKEN_EXPIRED",
        message: "Token expirado",
      },
    };
  }

  // Handle Zod validation errors (runtime contracts)
  if (errName === "ZodError") {
    return {
      statusCode: 400,
      body: {
        success: false,
        code: "VALIDATION_ERROR",
        message: "Error de validación",
        errors: readZodIssues(err),
      },
    };
  }

  // Handle Multer upload errors (spec 002 H-02): file too large -> 413.
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return {
        statusCode: 413,
        body: {
          success: false,
          code: "FILE_TOO_LARGE",
          message: "El archivo excede el tamaño máximo permitido",
        },
      };
    }
    return {
      statusCode: 400,
      body: {
        success: false,
        code: "UPLOAD_ERROR",
        message: "Error al procesar el archivo",
      },
    };
  }

  // Default fallback for any other errors
  return {
    statusCode: statusCode,
    body: {
      success: false,
      code: caught.code || "INTERNAL_ERROR",
      message: caught.message || "Error interno del servidor",
      ...(isDevelopment && { stack: err instanceof Error ? err.stack : undefined }),
    },
  };
}
