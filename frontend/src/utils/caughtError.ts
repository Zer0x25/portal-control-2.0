/**
 * Helpers for safely inspecting values caught in `catch` blocks.
 *
 * Mirrors the backend helper of the same name. Typing a catch binding as `any`
 * silences ESLint but also disables checking; reading `.message` off an
 * `unknown` is a type error, so the narrowing lives here instead.
 */

export interface CaughtError {
  /** Message of the thrown value, or a stringified fallback. */
  message: string;
  /** HTTP status carried by API error payloads, when present. */
  status?: number;
  isError: boolean;
}

/**
 * Narrow an unknown caught value to a readable error shape.
 * Never throws: non-Error values are stringified so callers can always read
 * `.message`.
 */
export const toCaughtError = (error: unknown): CaughtError => {
  if (error instanceof Error) {
    return { message: error.message, isError: true };
  }

  if (typeof error === "string") {
    return { message: error, isError: false };
  }

  if (error && typeof error === "object") {
    const candidate = error as Record<string, unknown>;
    return {
      message:
        typeof candidate.message === "string"
          ? candidate.message
          : typeof candidate.error === "string"
            ? candidate.error
            : JSON.stringify(error),
      status: typeof candidate.status === "number" ? candidate.status : undefined,
      isError: true,
    };
  }

  return { message: String(error), isError: false };
};
