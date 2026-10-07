import prisma, { withDirectTransaction } from "./db";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { auditService } from "./auditService";
import { mfaService } from "./mfaService";
import { toCaughtError } from "../utils/caughtError";
import { SocketService } from "./socketService";
import { AuthError, ForbiddenError, RateLimitError } from "../utils/AppError";

export class AuthService {
  private static readonly SECRET = process.env.JWT_SECRET || "";

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
      console.error("[AuthService] Error fetching session durations:", err);
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

    if (!user || !bcryptjs.compareSync(password, user.passwordHash)) {
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
    });

    return { token, role };
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
      if (employee.isPinBlocked) return { success: false, reason: "BLOCKED" };

      const defaultPin = employee.rut.slice(0, 4);
      const storedPin = employee.pin || defaultPin;

      let isPinValid = false;
      if (storedPin.startsWith("$2") || storedPin.length > 10) {
        isPinValid = bcryptjs.compareSync(pin, storedPin);
      } else {
        isPinValid = pin === storedPin;
      }

      if (isPinValid) {
        if (employee.pinFailedAttempts > 0) {
          await tx.employee.update({
            where: { id: employee.id },
            data: { pinFailedAttempts: 0 },
          });
        }

        const token = jwt.sign(
          {
            id: `kiosk-${employee.id}`,
            username: employee.name,
            role: "Kiosk_Employee",
            employeeId: employee.id,
          },
          this.SECRET,
          { expiresIn: "5m" },
        );

        return { success: true, token, employeeName: employee.name };
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

  static async revokeSession(token: string) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await prisma.activeSession
      .delete({
        where: { tokenHash },
      })
      .catch(() => {}); // Idempotent
  }

  static async setupMFA(userId: string, username: string) {
    const { base32, otpauthUrl } = mfaService.generateSecret(username);
    const qrCodeUrl = await mfaService.generateQRCode(otpauthUrl!);

    await prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: base32, mfaEnabled: false },
    });

    return { qrCode: qrCodeUrl, secret: base32 };
  }

  static async confirmMFASetup(userId: string, token: string) {
    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!dbUser || !dbUser.mfaSecret) throw new Error("MFA_NOT_CONFIGURED");

    const isValid = mfaService.verifyToken(dbUser.mfaSecret, token);
    if (!isValid) return false;

    await prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });

    return true;
  }

  static async validateMFALogin(mfaToken: string, code: string) {
    const decoded = jwt.verify(mfaToken, this.SECRET);
    if (
      typeof decoded === "string" ||
      decoded.mfaPending !== true ||
      typeof decoded.id !== "string" ||
      typeof decoded.credentialStamp !== "string"
    )
      throw new AuthError("Token MFA inválido");

    return withDirectTransaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${decoded.id} FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: decoded.id } });
      if (!user) throw new AuthError("MFA no disponible para esta cuenta");
      if (user.role === "Archivado")
        throw new ForbiddenError("Acceso denegado: Su cuenta de usuario está archivada");
      if (this.credentialStamp(user) !== decoded.credentialStamp)
        throw new AuthError("Credenciales cambiaron; reinicia el inicio de sesión");
      if (!user.mfaEnabled || !user.mfaSecret)
        throw new AuthError("MFA no disponible para esta cuenta");

      const now = Date.now();
      if (user.mfaBlockedUntil && user.mfaBlockedUntil.getTime() > now)
        throw new RateLimitError((user.mfaBlockedUntil.getTime() - now) / 1000);

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
        return { success: false };
      }
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
      const user = await prisma.user.findUnique({
        where: { username: username.toLowerCase() },
        select: { id: true, username: true },
      });
      if (!user) throw new Error("USER_NOT_FOUND");

      target = user.username;
      const result = await prisma.activeSession.deleteMany({
        where: { userId: user.id },
      });
      deletedCount = result.count;
    } else {
      const result = await prisma.activeSession.deleteMany({
        where: currentUserId ? { userId: { not: currentUserId } } : {},
      });
      deletedCount = result.count;
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
