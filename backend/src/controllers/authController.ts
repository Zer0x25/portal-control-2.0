import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { auditService } from "../services/auditService";
import { clearLoginFailures, recordLoginFailure } from "../middleware/loginLimiter";
import { AgentLogger } from "../utils/agentLogger";
import { asyncHandler } from "../middleware/errorHandler";
import { AuthError, ForbiddenError, ValidationError } from "../utils/AppError";
import { AuthRequest } from "../middleware/authMiddleware";

const mapRoleToFrontend = (role: string): string => {
  if (!role) return "Usuario";
  return role.replace(/_/g, " ");
};

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body;
  AgentLogger.log(`Intento de login para usuario: ${username}`, "AUTH");

  const authResult = await AuthService.authenticate(username, password, req.ip || "unknown");

  if (!authResult.success) {
    if (authResult.reason === "INVALID_CREDENTIALS") {
      await recordLoginFailure(req.ip || "unknown", username);
      await auditService.log({
        actorUsername: username || "ANONYMOUS",
        action: "LOGIN_FAILED",
        category: "OPERATIONS",
        severity: "WARNING",
        outcome: "FAILURE",
        details: { message: "Credenciales inválidas" },
        ipAddress: req.ip,
      });
      throw new AuthError("Credenciales inválidas");
    }

    if (authResult.reason === "USER_ARCHIVED") {
      throw new ForbiddenError("Acceso denegado: Su cuenta de usuario está archivada");
    }
  }

  const user = authResult.user!;

  if (user.mfaEnabled) {
    const mfaToken = AuthService.generateMFAPendingToken(user);
    return res.json({
      mfaRequired: true,
      mfaToken,
      userId: user.id,
      message: "MFA requerido para completar el inicio de sesión",
    });
  }

  await AuthService.manageSessionLimit(user.id, user.role);
  const { token, role } = await AuthService.createSession(
    user.id,
    user.username,
    user.role,
    user.employeeId,
    req.headers["user-agent"] || "Unknown",
  );

  await auditService.log({
    actorUsername: user.username,
    action: "LOGIN_SUCCESS",
    category: "AUTH",
    severity: "INFO",
    outcome: "SUCCESS",
    details: { userId: user.id, role: user.role },
    ipAddress: req.ip,
  });

  await clearLoginFailures(req.ip || "unknown", user.username);
  res.json({
    userId: user.id,
    username: user.username,
    role: mapRoleToFrontend(role),
    employeeId: user.employeeId,
    token,
    mustChangePassword: user.isForcePasswordChange ?? false,
    message: "Login exitoso",
  });
});

export const kioskLogin = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, pin } = req.body;
  AgentLogger.log(`Intento de login Kiosk para empleado: ${employeeId}`, "AUTH");

  const authResult = await AuthService.verifyKioskPin(employeeId, pin);

  if (authResult.success) {
    await clearLoginFailures(req.ip || "unknown", employeeId);
    await auditService.log({
      actorUsername: authResult.employeeName!,
      action: "KIOSK_PIN_SUCCESS",
      category: "AUTH",
      severity: "INFO",
      outcome: "SUCCESS",
      details: { employeeId },
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: "Verificación exitosa",
      employeeName: authResult.employeeName,
      token: authResult.token,
    });
  }

  if (authResult.reason === "NOT_FOUND") {
    // Frena enumeración de IDs (404-oráculo) y sondeo sobre bloqueados.
    await recordLoginFailure(req.ip || "unknown", employeeId);
    return res.status(404).json({ message: "Empleado no encontrado" });
  }

  if (authResult.reason === "BLOCKED") {
    await recordLoginFailure(req.ip || "unknown", employeeId);
    return res.status(403).json({ message: "PIN bloqueado. Contacte a un administrador." });
  }

  const isBlocked = authResult.isBlocked;
  const attempts = authResult.attempts || 0;

  await recordLoginFailure(req.ip || "unknown", employeeId);
  await auditService.log({
    actorUsername: "UNKNOWN_KIOSK_USER",
    action: "KIOSK_PIN_FAILED",
    category: "OPERATIONS",
    severity: "WARNING",
    outcome: "FAILURE",
    details: {
      employeeId,
      attempts,
      isBlocked,
    },
    ipAddress: req.ip,
  });

  return res.status(401).json({
    success: false,
    message: isBlocked ? "PIN bloqueado por demasiados intentos." : "PIN incorrecto.",
    attempts,
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    await AuthService.revokeSession(token);
  }

  const actor = (req as AuthRequest).user?.username || "ANONYMOUS";
  await auditService.log({
    actorUsername: actor,
    action: "LOGOUT",
    category: "AUTH",
    severity: "INFO",
    outcome: "SUCCESS",
    ipAddress: req.ip,
  });

  res.json({ message: "Logout exitoso" });
});

export const setupMFA = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as AuthRequest).user;
  if (!user) throw new AuthError("No autorizado");

  const result = await AuthService.setupMFA(user.id, user.username);

  res.json({
    qrCode: result.qrCode,
    secret: result.secret,
    message: "Escanee el código QR para configurar MFA",
  });
});

export const verifyMFASetup = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as AuthRequest).user;
  const { token } = req.body;

  const success = await AuthService.confirmMFASetup(user.id, token);
  if (!success) {
    throw new ValidationError("Código de verificación inválido");
  }

  await auditService.log({
    actorUsername: user.username,
    action: "MFA_ENABLED",
    category: "USER_MGMT",
    severity: "INFO",
    outcome: "SUCCESS",
    details: { userId: user.id },
  });

  res.json({ message: "MFA habilitado correctamente" });
});

export const validateMFA = asyncHandler(async (req: Request, res: Response) => {
  const { mfaToken, code } = req.body;

  const result = await AuthService.validateMFALogin(mfaToken, code);
  if (!result.success) {
    throw new AuthError("Código MFA incorrecto");
  }

  const user = result.user!;
  await AuthService.manageSessionLimit(user.id, user.role);

  const { token, role } = await AuthService.createSession(
    user.id,
    user.username,
    user.role,
    user.employeeId,
    req.headers["user-agent"] || "Unknown",
  );

  await auditService.log({
    actorUsername: user.username,
    action: "LOGIN_MFA_SUCCESS",
    category: "AUTH",
    severity: "INFO",
    outcome: "SUCCESS",
    details: { userId: user.id },
    ipAddress: req.ip,
  });

  await clearLoginFailures(req.ip || "unknown", user.username);
  res.json({
    userId: user.id,
    username: user.username,
    role: mapRoleToFrontend(role),
    employeeId: user.employeeId,
    token,
    mustChangePassword: user.isForcePasswordChange ?? false,
    message: "Autenticación de dos pasos exitosa",
  });
});
