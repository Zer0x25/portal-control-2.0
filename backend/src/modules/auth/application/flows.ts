import { AuthError, ForbiddenError, ValidationError } from "../../../utils/AppError";
export interface LoginUser {
  id: string;
  username: string;
  role: string;
  employeeId: string | null;
  mfaEnabled: boolean;
  isForcePasswordChange?: boolean | null;
}
export interface AuthFlowContext {
  ip?: string;
  userAgent?: string;
  user?: { id: string; username: string };
}
export interface AuthFlowDependencies {
  service: {
    authenticate(
      username: string,
      password: string,
      ip: string,
    ): Promise<{
      success: boolean;
      reason?: string;
      user?: LoginUser;
    }>;
    generateMFAPendingToken(user: LoginUser): string;
    manageSessionLimit(id: string, role: string): Promise<void>;
    createSession(
      id: string,
      username: string,
      role: string,
      employeeId: string | null,
      agent: string,
    ): Promise<{ token: string; role: string }>;
    verifyKioskPin(
      id: string,
      pin: string,
    ): Promise<{
      success: boolean;
      reason?: string;
      token?: string;
      employeeName?: string;
      attempts?: number;
      isBlocked?: boolean;
    }>;
    revokeSession(token: string): Promise<void>;
    setupMFA(id: string, username: string): Promise<{ qrCode: string; secret: string }>;
    confirmMFASetup(id: string, token: string): Promise<boolean>;
    validateMFALogin(token: string, code: string): Promise<{ success: boolean; user?: LoginUser }>;
  };
  failures: {
    record(ip: string, key: string): Promise<void>;
    clear(ip: string, key: string): Promise<void>;
  };
  audit(entry: {
    actorUsername: string;
    action: string;
    category: string;
    severity: "INFO" | "WARNING";
    outcome: "SUCCESS" | "FAILURE";
    details?: Record<string, unknown>;
    ipAddress?: string;
  }): Promise<void>;
  log(message: string, context: Record<string, unknown>): void;
}
export function createAuthFlows(deps: AuthFlowDependencies) {
  const success = (body: Record<string, unknown>) => ({ status: 200 as const, body });
  const requireUser = (context: AuthFlowContext) => {
    if (!context.user) throw new AuthError("No autorizado");
    return context.user;
  };
  const session = async (user: LoginUser, context: AuthFlowContext) => {
    await deps.service.manageSessionLimit(user.id, user.role);
    const result = await deps.service.createSession(
      user.id,
      user.username,
      user.role,
      user.employeeId,
      context.userAgent || "Unknown",
    );
    return {
      userId: user.id,
      username: user.username,
      role: result.role ? result.role.replace(/_/g, " ") : "Usuario",
      employeeId: user.employeeId,
      token: result.token,
      mustChangePassword: user.isForcePasswordChange ?? false,
    };
  };
  return {
    async login(input: { username: string; password: string }, context: AuthFlowContext) {
      const { username, password } = input;
      deps.log("Intento de login", { username });
      const result = await deps.service.authenticate(username, password, context.ip || "unknown");
      if (!result.success) {
        if (result.reason === "INVALID_CREDENTIALS") {
          await deps.failures.record(context.ip || "unknown", username);
          await deps.audit({
            actorUsername: username || "ANONYMOUS",
            action: "LOGIN_FAILED",
            category: "OPERATIONS",
            severity: "WARNING",
            outcome: "FAILURE",
            details: { message: "Credenciales inválidas" },
            ipAddress: context.ip,
          });
          throw new AuthError("Credenciales inválidas");
        }
        if (result.reason === "USER_ARCHIVED")
          throw new ForbiddenError("Acceso denegado: Su cuenta de usuario está archivada");
      }
      const user = result.user;
      if (!user) throw new Error("Authentication result missing user");
      if (user.mfaEnabled)
        return success({
          mfaRequired: true,
          mfaToken: deps.service.generateMFAPendingToken(user),
          userId: user.id,
          message: "MFA requerido para completar el inicio de sesión",
        });
      const body = await session(user, context);
      await deps.audit({
        actorUsername: user.username,
        action: "LOGIN_SUCCESS",
        category: "AUTH",
        severity: "INFO",
        outcome: "SUCCESS",
        details: { userId: user.id, role: user.role },
        ipAddress: context.ip,
      });
      await deps.failures.clear(context.ip || "unknown", user.username);
      return success({ ...body, message: "Login exitoso" });
    },
    async kioskLogin(input: { employeeId: string; pin: string }, context: AuthFlowContext) {
      const { employeeId, pin } = input;
      deps.log("Intento de login Kiosk", { employeeId });
      const result = await deps.service.verifyKioskPin(employeeId, pin);
      if (result.success) {
        if (!result.employeeName || !result.token)
          throw new Error("Kiosk result missing identity or token");
        await deps.failures.clear(context.ip || "unknown", employeeId);
        await deps.audit({
          actorUsername: result.employeeName,
          action: "KIOSK_PIN_SUCCESS",
          category: "AUTH",
          severity: "INFO",
          outcome: "SUCCESS",
          details: { employeeId },
          ipAddress: context.ip,
        });
        return success({
          success: true,
          message: "Verificación exitosa",
          employeeName: result.employeeName,
          token: result.token,
        });
      }
      await deps.failures.record(context.ip || "unknown", employeeId);
      if (result.reason === "NOT_FOUND")
        return { status: 404, body: { message: "Empleado no encontrado" } };
      if (result.reason === "BLOCKED")
        return { status: 403, body: { message: "PIN bloqueado. Contacte a un administrador." } };
      const attempts = result.attempts || 0;
      await deps.audit({
        actorUsername: "UNKNOWN_KIOSK_USER",
        action: "KIOSK_PIN_FAILED",
        category: "OPERATIONS",
        severity: "WARNING",
        outcome: "FAILURE",
        details: { employeeId, attempts, isBlocked: result.isBlocked },
        ipAddress: context.ip,
      });
      return {
        status: 401,
        body: {
          success: false,
          message: result.isBlocked ? "PIN bloqueado por demasiados intentos." : "PIN incorrecto.",
          attempts,
        },
      };
    },
    async logout(token: string | undefined, context: AuthFlowContext) {
      if (token) await deps.service.revokeSession(token);
      await deps.audit({
        actorUsername: context.user?.username || "ANONYMOUS",
        action: "LOGOUT",
        category: "AUTH",
        severity: "INFO",
        outcome: "SUCCESS",
        ipAddress: context.ip,
      });
      return success({ message: "Logout exitoso" });
    },
    async setupMFA(context: AuthFlowContext) {
      const user = requireUser(context);
      const result = await deps.service.setupMFA(user.id, user.username);
      return success({
        qrCode: result.qrCode,
        secret: result.secret,
        message: "Escanee el código QR para configurar MFA",
      });
    },
    async verifyMFASetup(input: { token: string }, context: AuthFlowContext) {
      const user = requireUser(context);
      if (!(await deps.service.confirmMFASetup(user.id, input.token)))
        throw new ValidationError("Código de verificación inválido");
      await deps.audit({
        actorUsername: user.username,
        action: "MFA_ENABLED",
        category: "USER_MGMT",
        severity: "INFO",
        outcome: "SUCCESS",
        details: { userId: user.id },
      });
      return success({ message: "MFA habilitado correctamente" });
    },
    async validateMFA(input: { mfaToken: string; code: string }, context: AuthFlowContext) {
      const result = await deps.service.validateMFALogin(input.mfaToken, input.code);
      if (!result.success) throw new AuthError("Código MFA incorrecto");
      const user = result.user;
      if (!user) throw new Error("MFA result missing user");
      const body = await session(user, context);
      await deps.audit({
        actorUsername: user.username,
        action: "LOGIN_MFA_SUCCESS",
        category: "AUTH",
        severity: "INFO",
        outcome: "SUCCESS",
        details: { userId: user.id },
        ipAddress: context.ip,
      });
      await deps.failures.clear(context.ip || "unknown", user.username);
      return success({ ...body, message: "Autenticación de dos pasos exitosa" });
    },
  };
}
export type AuthFlows = ReturnType<typeof createAuthFlows>;
