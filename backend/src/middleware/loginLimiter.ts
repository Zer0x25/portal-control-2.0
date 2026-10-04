import { Request, Response, NextFunction } from "express";
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

function extractUserKey(body: unknown): string {
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

export const loginRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || "unknown";
  const key = buildKey(ip, extractUserKey(req.body));

  try {
    const resMemory = await loginLimiter.get(key);
    if (resMemory && resMemory.remainingPoints <= 0) {
      const retryAfter = Math.round(resMemory.msBeforeNext / 1000) || 1;
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({
        message: `Demasiados intentos. Intente en ${retryAfter} segundos.`,
      });
    }

    const resConsecutive = await consecutiveFailuresLimiter.get(key);
    if (resConsecutive && resConsecutive.remainingPoints <= 0) {
      const retryAfter = Math.round(resConsecutive.msBeforeNext / 1000) || 1;
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({
        message: `Cuenta bloqueada temporalmente por seguridad. Intente en ${retryAfter} segundos.`,
      });
    }

    next();
  } catch {
    next();
  }
};

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
