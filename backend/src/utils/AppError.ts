/**
 * Custom error class for standardized error handling
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR",
    isOperational: boolean = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Payload attached to a `ValidationError`.
 *
 * Callers pass two different shapes from Zod: `ZodIssue` objects (which carry
 * `path` + `message`) and `ZodFormattedError` objects (a record keyed by field
 * path, with no common fields). Rather than forcing one shape on callers, this
 * stays a generic transport for validation output. Use the `E` parameter at
 * call sites that know the concrete issue type.
 */
export class ValidationError<TIssue = unknown> extends AppError {
  public readonly errors: TIssue[];

  constructor(message: string, errors: TIssue[] = []) {
    super(message, 400, "VALIDATION_ERROR");
    this.errors = errors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Raised when a manual accounting-period closure is rejected because pending
 * items would be locked. The blocking items ride along in `blocking`; the API
 * layer (config flows) matches on `message` and surfaces a display string,
 * so the generic parameter lets the caller keep its concrete payload type.
 */
export class ClosureBlockedError<TBlocking = unknown> extends AppError {
  public readonly blocking: TBlocking | undefined;

  constructor(blocking?: TBlocking, message: string = "LOCK_DATE_BLOCKED") {
    super(message, 400, "LOCK_DATE_BLOCKED");
    this.blocking = blocking;
    Object.setPrototypeOf(this, ClosureBlockedError.prototype);
  }
}

/**
 * Authentication error class
 */
export class AuthError extends AppError {
  constructor(message: string = "Autenticación requerida") {
    super(message, 401, "UNAUTHORIZED");
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

/**
 * Authorization error class
 */
export class ForbiddenError extends AppError {
  constructor(message: string = "Acceso denegado") {
    super(message, 403, "FORBIDDEN");
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends AppError {
  constructor(message: string = "Recurso no encontrado") {
    super(message, 404, "NOT_FOUND");
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Database error class
 */
export class DatabaseError extends AppError {
  constructor(message: string = "Error en la base de datos") {
    super(message, 500, "DATABASE_ERROR");
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * Conflict error class (e.g., duplicate unique key)
 */
export class ConflictError extends AppError {
  constructor(message: string = "Conflicto: El recurso ya existe") {
    super(message, 409, "CONFLICT");
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/** Operational throttling error shared by HTTP adapters. */
export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(retryAfter: number) {
    super("Demasiados intentos MFA. Intente más tarde.", 429, "MFA_RATE_LIMITED");
    this.retryAfter = Math.max(1, Math.ceil(retryAfter));
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}
