import { Request, Response, NextFunction } from "express";
import { inspectLoginFailures } from "../services/loginFailures";
export { recordLoginFailure, clearLoginFailures } from "../services/loginFailures";

export const loginRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  const blocked = await inspectLoginFailures(req.ip || "unknown", req.body);
  if (blocked)
    return res
      .set("Retry-After", String(blocked.retryAfter))
      .status(429)
      .json({ message: blocked.message });
  next();
};
