import type { AuthRequest } from "../middleware/authMiddleware";
import { asyncHandler } from "../middleware/errorHandler";
import { authFlows } from "../services/authFlows";

const context = (req: AuthRequest) => ({
  ip: req.ip,
  userAgent: req.headers?.["user-agent"],
  user: req.user,
});
export const login = asyncHandler(async (req, res) => {
  const result = await authFlows.login(req.body, context(req));
  res.status(result.status).json(result.body);
});
export const kioskLogin = asyncHandler(async (req, res) => {
  const result = await authFlows.kioskLogin(req.body, context(req));
  res.status(result.status).json(result.body);
});
export const logout = asyncHandler(async (req, res) => {
  const result = await authFlows.logout(req.headers.authorization?.split(" ")[1], context(req));
  res.status(result.status).json(result.body);
});
export const setupMFA = asyncHandler(async (req, res) => {
  const result = await authFlows.setupMFA(context(req));
  res.status(result.status).json(result.body);
});
export const verifyMFASetup = asyncHandler(async (req, res) => {
  const result = await authFlows.verifyMFASetup(req.body, context(req));
  res.status(result.status).json(result.body);
});
export const validateMFA = asyncHandler(async (req, res) => {
  const result = await authFlows.validateMFA(req.body, context(req));
  res.status(result.status).json(result.body);
});
