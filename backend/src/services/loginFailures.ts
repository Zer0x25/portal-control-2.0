import { RateLimiterMemory } from "rate-limiter-flexible";

const isDev = process.env.NODE_ENV !== "production";

const loginLimiter = new RateLimiterMemory({
  points: isDev ? 30 : 5,
  duration: 60,
  blockDuration: isDev ? 10 : 60,
});

const consecutiveFailuresLimiter = new RateLimiterMemory({
  points: isDev ? 50 : 10,
  duration: 60 * 60 * 24,
  blockDuration: isDev ? 60 : 60 * 60,
});

export function extractUserKey(body: unknown): string {
  if (typeof body !== "object" || body === null) return "";
  const b = body as Record<string, unknown>;
  // Login manda `username`; kiosk-login manda `employeeId` (caza-bugs 2026-10-04:
  // el kiosco no tenía throttle porque la clave solo miraba username).
  const raw = typeof b.username === "string" ? b.username : b.employeeId;
  return typeof raw === "string" ? raw : "";
}

function buildKey(ip: string, userKey?: string): string {
  const normalized = (userKey || "").trim().toLowerCase();
  return normalized ? `${ip}:${normalized}` : ip;
}

export async function inspectLoginFailures(
  ip: string,
  body: unknown,
): Promise<{ retryAfter: number; message: string } | null> {
  const key = buildKey(ip, extractUserKey(body));
  try {
    const short = await loginLimiter.get(key);
    if (short && short.remainingPoints <= 0) {
      const retryAfter = Math.round(short.msBeforeNext / 1000) || 1;
      return { retryAfter, message: `Demasiados intentos. Intente en ${retryAfter} segundos.` };
    }
    const consecutive = await consecutiveFailuresLimiter.get(key);
    if (consecutive && consecutive.remainingPoints <= 0) {
      const retryAfter = Math.round(consecutive.msBeforeNext / 1000) || 1;
      return {
        retryAfter,
        message: `Cuenta bloqueada temporalmente por seguridad. Intente en ${retryAfter} segundos.`,
      };
    }
  } catch {
    // Preserve existing fail-open policy if the in-memory store fails.
  }
  return null;
}
export const recordLoginFailure = async (ip: string, userKey?: string) => {
  const key = buildKey(ip, userKey);
  try {
    await loginLimiter.consume(key);
    await consecutiveFailuresLimiter.consume(key);
  } catch {
    // points already consumed
  }
};

export const clearLoginFailures = async (ip: string, userKey?: string) => {
  const key = buildKey(ip, userKey);
  try {
    await loginLimiter.delete(key);
    await consecutiveFailuresLimiter.delete(key);
  } catch {
    // ignore
  }
};
