/**
 * Helpers for safely inspecting values caught in `catch` blocks.
 *
 * Services signal control flow through custom error fields (for example a
 * service throwing `new Error("LOCK_DATE_BLOCKED")` and the controller reading
 * `error.message`). Typing the catch binding as `any` silences ESLint but also
 * disables checking, so those reads are done here against a narrow shape
 * instead.
 */

export interface CaughtError {
  /** Message of the thrown value, when it is an `Error`. */
  message: string;
  /** Optional code some services attach to the thrown error. */
  code?: string;
  /** Optional display message used by the API layer. */
  message_display?: string;
  /** Optional validation details attached by domain services. */
  details?: unknown;
  /** HTTP status carried by AppError subclasses; 0 when absent. */
  statusCode: number;
  isAppError: boolean;
}

/**
 * Narrow an unknown caught value to a readable error shape.
 * Never throws: non-Error values are stringified so callers can always read
 * `.message`.
 */
export const toCaughtError = (error: unknown): CaughtError => {
  if (error instanceof Error) {
    const candidate = error as Error &
      Partial<Omit<CaughtError, "message" | "statusCode" | "isAppError">> & {
        statusCode?: unknown;
      };
    const statusCode = typeof candidate.statusCode === "number" ? candidate.statusCode : 0;
    return {
      message: error.message,
      code: typeof candidate.code === "string" ? candidate.code : undefined,
      message_display:
        typeof candidate.message_display === "string" ? candidate.message_display : undefined,
      details: candidate.details,
      statusCode,
      isAppError: statusCode > 0,
    };
  }

  if (typeof error === "string") {
    return { message: error, statusCode: 0, isAppError: false };
  }

  if (error && typeof error === "object") {
    const candidate = error as Record<string, unknown>;
    const statusCode = typeof candidate.statusCode === "number" ? candidate.statusCode : 0;
    return {
      message: typeof candidate.message === "string" ? candidate.message : String(error),
      code: typeof candidate.code === "string" ? candidate.code : undefined,
      message_display:
        typeof candidate.message_display === "string" ? candidate.message_display : undefined,
      details: candidate.details,
      statusCode,
      isAppError: statusCode > 0,
    };
  }

  return { message: String(error), statusCode: 0, isAppError: false };
};
