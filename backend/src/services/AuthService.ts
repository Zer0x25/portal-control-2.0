import prisma, { withDirectTransaction } from "./db";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { auditService } from "./auditService";
import { mfaService } from "./mfaService";
import { toCaughtError } from "../utils/caughtError";
import { SocketService } from "./socketService";
import {
  AuthError,
  ConflictError,
  ForbiddenError,
  RateLimitError,
  ValidationError,
} from "../utils/AppError";
import { logger } from "../utils/logger";

const canonicalRole = (role?: string | null): string =>
  role ? role.trim().replace(/\s+/g, "_") : "Usuario";

export class AuthService {
  private static get SECRET(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("CRITICAL: JWT_SECRET environment variable is not set.");
    }
    return secret;
  }

  private static credentialStamp(user: { id: string; passwordHash: string }): string {
    // Opaque proof of the password validated by this login; never exposes the hash.
    return crypto
      .createHmac("sha256", this.SECRET)
      .update(JSON.stringify(["auth-credential-version-v1", user.id, user.passwordHash]))
      .digest("hex");
  }

  static async getSessionDurationHours(role: string): Promise<number> {
    try {
      const config = await prisma.systemConfig.findUnique({
        where: { key: "AUTH_SESSION_DURATIONS" },
      });

      if (config) {
        const durations = JSON.parse(config.value);
        if (durations[role] !== undefined) return Number(durations[role]);

        const normalizedRole = role.replace(/ /g, "_");
        if (durations[normalizedRole] !== undefined) return Number(durations[normalizedRole]);

        if (durations["default"] !== undefined) return Number(durations["default"]);
      }
    } catch (err) {
      logger.error("[AuthService] Error fetching session durations", err);
    }

    // Fallback values
    switch (role) {
      case "Administrador":
        return 10;
      case "Supervisor_Elevado":
      case "Supervisor Elevado":
        return 4;
      case "Supervisor":
      case "Fiscalizador":
        return 1;
      case "Reloj_Control":
      case "Reloj Control":
        return 12;
      case "Usuario":
        return 0.03;
      default:
        return 1;
    }
  }

  static async authenticate(username: string, password: string, _ip?: string) {
    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
    });

    if (!user || !(await bcryptjs.compare(password, user.passwordHash))) {
      return { success: false, reason: "INVALID_CREDENTIALS" };
    }

    if (user.role === "Archivado") {
      return { success: false, reason: "USER_ARCHIVED" };
    }

    return { success: true, user: { ...user, credentialStamp: this.credentialStamp(user) } };
  }

  static sessionLimitForRole(role: string): number {
    if (role === "Administrador") return 10;
    if (role === "Reloj_Control") return 2;
    return 1;
  }

  static async manageSessionLimit(userId: string, role: string) {
    const sessionLimit = this.sessionLimitForRole(role);

    const activeSessionsCount = await prisma.activeSession.count({
      where: { userId },
    });

    if (activeSessionsCount >= sessionLimit) {
      const oldestSession = await prisma.activeSession.findFirst({
        where: { userId },
        orderBy: { lastActive: "asc" },
      });

      if (oldestSession) {
        // Tolerante a carreras: otro login concurrente puede haber evictado
        // ya esta misma fila (P2025). No es error: el cupo se liberó igual.
        try {
          await prisma.activeSession.delete({
            where: { id: oldestSession.id },
          });
        } catch (error: unknown) {
          if (toCaughtError(error).code !== "P2025") throw error;
        }
      }
    }
  }

  static async createSession(
    userId: string,
    username: string,
    role: string,
    employeeId: string | null,
    userAgent: string,
    expectedCredentialStamp?: string,
  ) {
    const sessionHours = await this.getSessionDurationHours(role);
    // jti único por sesión: sin nonce, dos logins dentro del mismo segundo
    // generan JWT idénticos (iat es segundos) y el insert choca con el
    // @unique de token_hash (409 "unknown"). crypto.randomUUID es el nonce.
    const token = jwt.sign(
      { id: userId, username, role, employeeId, jti: crypto.randomUUID() },
      this.SECRET,
      {
        expiresIn: `${sessionHours}h`,
      },
    );

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + sessionHours * 60 * 60 * 1000);
    const device = userAgent.substring(0, 255);

    // Cupo + insert en una sola tx bajo lock por usuario (caza-bugs 2026-10-04):
    // el trim sin serializar borraba TODO (trims concurrentes con keeps
    // distintos se eliminan entre sí). Serializados, acuerdan el mismo set y
    // queda exactamente el cupo (1 para Usuario). Xact-scoped, seguro tras PgBouncer.
    await withDirectTransaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      if (expectedCredentialStamp !== undefined) {
        const current = await tx.user.findUnique({ where: { id: userId } });
        if (
          !current ||
          this.credentialStamp(current) !== expectedCredentialStamp ||
          current.username !== username ||
          current.role !== role ||
          current.employeeId !== employeeId
        )
          throw new AuthError("Credenciales cambiaron; reinicia el inicio de sesión");
      }
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"sess:" + userId}))`;
      const sessionLimit = this.sessionLimitForRole(role);
      const keep = await tx.activeSession.findMany({
        where: { userId },
        // Preserve the existing policy: evict least recently active sessions.
        orderBy: [{ lastActive: "desc" }, { id: "desc" }],
        take: sessionLimit - 1,
        select: { id: true },
      });
      await tx.activeSession.deleteMany({
        where: { userId, id: { notIn: keep.map((k) => k.id) } },
      });
      await tx.activeSession.create({
        data: { userId, tokenHash, deviceInfo: device, expiresAt },
      });
      await tx.user.update({
        where: { id: userId },
        data: { lastLogin: new Date() },
      });
    });

    return { token, role: canonicalRole(role) };
  }

  static generateMFAPendingToken(user: {
    id: string;
    username: string;
    role: string;
    credentialStamp: string;
  }) {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        mfaPending: true,
        credentialStamp: user.credentialStamp,
        jti: crypto.randomUUID(),
      },
      this.SECRET,
      { expiresIn: "5m" },
    );
  }

  static async verifyKioskPin(employeeId: string, pin: string) {
    return withDirectTransaction(async (tx) => {
      // Lock before reading; concurrent failures and admin updates share this row lock.
      await tx.$queryRaw`SELECT id FROM employees WHERE id = ${employeeId} FOR UPDATE`;
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
      });

      if (!employee) return { success: false, reason: "NOT_FOUND" };
      if (employee.status !== "Activo") return { success: false, reason: "ARCHIVED" };
      if (employee.isPinBlocked) return { success: false, reason: "BLOCKED" };

      let isPinValid = false;
      if (employee.pin && (employee.pin.startsWith("$2") || employee.pin.length > 10)) {
        isPinValid = await bcryptjs.compare(pin, employee.pin);
      }

      if (isPinValid) {
        if (employee.pinFailedAttempts > 0) {
          await tx.employee.update({
            where: { id: employee.id },
            data: { pinFailedAttempts: 0 },
          });
        }

        const jti = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await tx.verification.create({
          data: {
            id: `kiosk-jti:${jti}`,
            identifier: `kiosk-jti:${employee.id}`,
            value: "active",
            expiresAt,
          },
        });

        const token = jwt.sign(
          {
            id: `kiosk-${employee.id}`,
            username: employee.name,
            role: "Kiosk_Employee",
            employeeId: employee.id,
            jti,
          },
          this.SECRET,
          { expiresIn: "5m" },
        );

        const mustChangePin = employee.pin
          ? await bcryptjs.compare(employee.rut.slice(0, 4), employee.pin)
          : false;

        return { success: true, token, employeeName: employee.name, mustChangePin };
      } else {
        const newAttempts = employee.pinFailedAttempts + 1;
        const isBlocked = newAttempts >= 5;

        await tx.employee.update({
          where: { id: employee.id },
          data: {
            pinFailedAttempts: newAttempts,
            isPinBlocked: isBlocked,
          },
        });

        return { success: false, reason: "INVALID_PIN", attempts: newAttempts, isBlocked };
      }
    });
  }

  static async revokeSession(token: string): Promise<{ username: string; userId: string } | null> {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const existing = await prisma.activeSession
      .findUnique({
        where: { tokenHash },
        select: {
          userId: true,
          user: { select: { username: true } },
        },
      })
      .catch(() => null);

    await prisma.activeSession.deleteMany({ where: { tokenHash } }).catch(() => {});

    let resolved: { username: string; userId: string } | null = existing
      ? { userId: existing.userId, username: existing.user.username }
      : null;

    if (!resolved) {
      try {
        const decoded: unknown = jwt.verify(token, this.SECRET, { ignoreExpiration: true });
        if (
          decoded &&
          typeof decoded === "object" &&
          "id" in decoded &&
          "username" in decoded &&
          typeof decoded.id === "string" &&
          typeof decoded.username === "string"
        ) {
          const role = "role" in decoded && typeof decoded.role === "string" ? decoded.role : "";
          if (role === "Kiosk_Employee") {
            const jti = "jti" in decoded && typeof decoded.jti === "string" ? decoded.jti : null;
            if (jti) {
              await prisma.verification
                .deleteMany({ where: { id: `kiosk-jti:${jti}` } })
                .catch(() => {});
            }
            resolved = { userId: decoded.id, username: decoded.username };
          } else {
            const dbUser = await prisma.user
              .findUnique({
                where: { id: decoded.id },
                select: { id: true, username: true },
              })
              .catch(() => null);
            resolved = dbUser
              ? { userId: dbUser.id, username: dbUser.username }
              : { userId: decoded.id, username: decoded.username };
          }
        }
      } catch {
        // Invalid signature: caller treats logout as unauthenticated.
      }
    }

    SocketService.emitForceLogoutToSession(tokenHash, {
      isHash: true,
      reason: "SESSION_INVALIDATED",
    });

    return resolved;
  }

  static async setupMFA(userId: string, username: string) {
    return withDirectTransaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const dbUser = await tx.user.findUnique({
        where: { id: userId },
        select: { mfaEnabled: true },
      });
      if (!dbUser) throw new AuthError("Usuario no encontrado");
      if (dbUser.mfaEnabled) {
        throw new ConflictError("MFA ya se encuentra habilitado para esta cuenta");
      }

      const { base32, otpauthUrl } = mfaService.generateSecret(username);
      const qrCodeUrl = await mfaService.generateQRCode(otpauthUrl!);

      await tx.user.update({
        where: { id: userId },
        data: { mfaSecret: base32, mfaEnabled: false },
      });

      return { qrCode: qrCodeUrl, secret: base32 };
    });
  }

  static async confirmMFASetup(userId: string, token: string) {
    return withDirectTransaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const dbUser = await tx.user.findUnique({
        where: { id: userId },
        select: { mfaSecret: true, mfaEnabled: true },
      });
      if (!dbUser || !dbUser.mfaSecret) {
        throw new ValidationError("MFA no configurado. Ejecute la configuración inicial primero.");
      }
      if (dbUser.mfaEnabled) {
        throw new ConflictError("MFA ya se encuentra habilitado para esta cuenta");
      }

      const isValid = mfaService.verifyToken(dbUser.mfaSecret, token);
      if (!isValid) return false;

      await tx.user.update({
        where: { id: userId },
        data: { mfaEnabled: true },
      });

      return true;
    });
  }

  static async validateMFALogin(mfaToken: string, code: string) {
    let decoded: unknown;
    try {
      decoded = jwt.verify(mfaToken, this.SECRET);
    } catch (error) {
      if (
        error instanceof Error &&
        ["JsonWebTokenError", "TokenExpiredError"].includes(error.name)
      ) {
        throw new AuthError("Token MFA inválido o expirado");
      }
      throw error;
    }
    if (
      !decoded ||
      typeof decoded !== "object" ||
      !("mfaPending" in decoded) ||
      decoded.mfaPending !== true ||
      !("id" in decoded) ||
      typeof decoded.id !== "string" ||
      !("credentialStamp" in decoded) ||
      typeof decoded.credentialStamp !== "string" ||
      !("jti" in decoded) ||
      typeof decoded.jti !== "string" ||
      !decoded.jti
    ) {
      throw new AuthError("Token MFA inválido");
    }

    const userId = decoded.id;
    const expectedStamp = decoded.credentialStamp;
    const jti = decoded.jti;
    const expSeconds =
      "exp" in decoded && typeof decoded.exp === "number" ? decoded.exp : undefined;

    return withDirectTransaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new AuthError("MFA no disponible para esta cuenta");
      if (user.role === "Archivado")
        throw new ForbiddenError("Acceso denegado: Su cuenta de usuario está archivada");
      if (this.credentialStamp(user) !== expectedStamp)
        throw new AuthError("Credenciales cambiaron; reinicia el inicio de sesión");
      if (!user.mfaEnabled || !user.mfaSecret)
        throw new AuthError("MFA no disponible para esta cuenta");

      const consumedId = `mfa-jti:${jti}`;
      const alreadyConsumed = await tx.verification.findUnique({
        where: { id: consumedId },
        select: { id: true },
      });
      if (alreadyConsumed) {
        throw new AuthError("Token MFA ya utilizado; reinicia el inicio de sesión");
      }

      const now = Date.now();
      if (user.mfaBlockedUntil && user.mfaBlockedUntil.getTime() > now)
        throw new RateLimitError((user.mfaBlockedUntil.getTime() - now) / 1000, user.username);

      const windowMs = 5 * 60 * 1000;
      const freshWindow =
        !user.mfaFailureWindowStartedAt ||
        now - user.mfaFailureWindowStartedAt.getTime() >= windowMs ||
        user.mfaBlockedUntil !== null;
      if (!mfaService.verifyToken(user.mfaSecret, code)) {
        const attempts = (freshWindow ? 0 : user.mfaFailedAttempts) + 1;
        await tx.user.update({
          where: { id: user.id },
          data: {
            mfaFailedAttempts: attempts,
            mfaFailureWindowStartedAt: freshWindow ? new Date(now) : user.mfaFailureWindowStartedAt,
            mfaBlockedUntil: attempts >= 5 ? new Date(now + windowMs) : null,
          },
        });
        // Return, do not throw: failure accounting must commit before the flow raises 401.
        return { success: false, actorUsername: user.username, userId: user.id };
      }
      await tx.verification.create({
        data: {
          id: consumedId,
          identifier: `mfa-jti:${user.id}`,
          value: "consumed",
          expiresAt: expSeconds ? new Date(expSeconds * 1000) : new Date(now + 5 * 60 * 1000),
        },
      });
      await tx.user.update({
        where: { id: user.id },
        data: {
          mfaFailedAttempts: 0,
          mfaFailureWindowStartedAt: null,
          mfaBlockedUntil: null,
        },
      });
      return { success: true, user: { ...user, credentialStamp: this.credentialStamp(user) } };
    });
  }

  static async purgeSessions(params: {
    username?: string;
    currentUserId?: string;
    actorUsername: string;
  }) {
    const { username, currentUserId, actorUsername } = params;
    let deletedCount = 0;
    let target = "all";

    if (username) {
      const user = await prisma.user.findFirst({
        where: { username: { equals: username.trim(), mode: "insensitive" } },
        select: { id: true, username: true },
      });
      if (!user) throw new Error("USER_NOT_FOUND");

      target = user.username;
      const result = await prisma.activeSession.deleteMany({
        where: { userId: user.id },
      });
      deletedCount = result.count;
      SocketService.emitForceLogoutToUser(user.id, { reason: "SESSION_INVALIDATED" });
    } else {
      const result = await prisma.activeSession.deleteMany({
        where: currentUserId ? { userId: { not: currentUserId } } : {},
      });
      deletedCount = result.count;
      SocketService.emitForceLogoutAllExcept(currentUserId, { reason: "SESSION_INVALIDATED" });
    }

    await auditService.log({
      actorUsername,
      action: "PURGE_SESSIONS",
      category: "AUTH",
      severity: "WARNING",
      details: {
        target,
        deletedCount,
        preservedCurrentUser: !username && !!currentUserId,
      },
    });

    return { deletedCount, target };
  }

  static async invalidateAllSessions(params: {
    actorUsername: string;
    reason: string;
    restartRecommended?: boolean;
  }) {
    const result = await prisma.activeSession.deleteMany({});
    return this.notifySessionInvalidation(params, result.count);
  }

  static async notifySessionInvalidation(
    params: { actorUsername: string; reason: string; restartRecommended?: boolean },
    deletedCount: number,
  ) {
    const { actorUsername, reason, restartRecommended = false } = params;

    const payload = {
      reason,
      restartRecommended,
      forcedAt: new Date().toISOString(),
    };

    SocketService.emitToAll("auth:force_logout", payload);
    setTimeout(() => {
      SocketService.disconnectAllClients(reason);
    }, 150);

    await auditService.log({
      actorUsername,
      action: "INVALIDATE_ALL_SESSIONS",
      category: "AUTH",
      severity: "CRITICAL",
      details: {
        reason,
        deletedCount,
        restartRecommended,
      },
    });

    return {
      deletedCount,
      reason,
    };
  }

  static async getUserById(id: string) {
    return await prisma.user.findUnique({ where: { id } });
  }
}
