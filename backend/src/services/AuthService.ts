import prisma from "./db";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { auditService } from "./auditService";
import { mfaService } from "./mfaService";
import { toCaughtError } from "../utils/caughtError";
import { SocketService } from "./socketService";

/**
 * Claims carried by the short-lived token issued between the first MFA factor
 * succeeding and the second factor being submitted. `mfaPending` is deliberately
 * local to this service — it is never consumed by `authenticateToken`.
 */
type MfaPendingClaims = {
  id: string;
  username: string;
  role: string;
  mfaPending: true;
};

export class AuthService {
  private static readonly SECRET = process.env.JWT_SECRET || "";

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

    return { success: true, user };
  }

  static async manageSessionLimit(userId: string, role: string) {
    let sessionLimit = 1;
    if (role === "Administrador") sessionLimit = 10;
    else if (role === "Reloj_Control") sessionLimit = 2;

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

    await prisma.activeSession.create({
      data: {
        userId,
        tokenHash,
        deviceInfo: userAgent.substring(0, 255),
        expiresAt: new Date(Date.now() + sessionHours * 60 * 60 * 1000),
      },
    });

    return { token, role };
  }

  static generateMFAPendingToken(user: { id: string; username: string; role: string }) {
    return jwt.sign(
      { id: user.id, username: user.username, role: user.role, mfaPending: true },
      this.SECRET,
      { expiresIn: "5m" },
    );
  }

  static async verifyKioskPin(employeeId: string, pin: string) {
    const employee = await prisma.employee.findUnique({
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
        await prisma.employee.update({
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

      await prisma.employee.update({
        where: { id: employee.id },
        data: {
          pinFailedAttempts: newAttempts,
          isPinBlocked: isBlocked,
        },
      });

      return { success: false, reason: "INVALID_PIN", attempts: newAttempts, isBlocked };
    }
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
    const decoded = jwt.verify(mfaToken, this.SECRET) as MfaPendingClaims;
    if (!decoded.mfaPending) throw new Error("INVALID_MFA_TOKEN");

    const user = await prisma.user.findUnique({ where: { id: String(decoded.id) } });
    if (!user || !user.mfaSecret) throw new Error("USER_OR_MFA_MISSING");

    const isValid = mfaService.verifyToken(user.mfaSecret, code);
    if (!isValid) return { success: false };

    return { success: true, user };
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
    const { actorUsername, reason, restartRecommended = false } = params;
    const result = await prisma.activeSession.deleteMany({});

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
        deletedCount: result.count,
        restartRecommended,
      },
    });

    return {
      deletedCount: result.count,
      reason,
    };
  }

  static async getUserById(id: string) {
    return await prisma.user.findUnique({ where: { id } });
  }
}
