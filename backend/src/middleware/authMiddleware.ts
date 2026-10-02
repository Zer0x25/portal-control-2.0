import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthError, ForbiddenError } from "../utils/AppError";
import { requestContext } from "../utils/context";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
    employeeId?: string | null;
  };
}

export interface JwtPayload {
  id: string;
  username: string;
  role: string;
  employeeId?: string | null;
}

import crypto from "crypto";
import prisma from "../services/db";

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  let token = headerValue?.startsWith("Bearer ")
    ? headerValue.slice("Bearer ".length).trim()
    : headerValue?.split(" ")[1];

  // Permite token por query parameter para descargas directas
  if (!token && req.query.token) {
    token = req.query.token as string;
  }

  if (!token) return next(new AuthError("Token de acceso no proporcionado"));

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("CRITICAL: JWT_SECRET no está configurado en el entorno.");
    return next(new Error("Error interno de configuración de seguridad"));
  }

  try {
    const decoded = jwt.verify(token, secret) as unknown as JwtPayload;
    const tokenUser = {
      id: decoded?.id,
      username: decoded?.username,
      role: decoded?.role,
      employeeId: decoded?.employeeId ?? null,
    };

    if (!tokenUser.id || !tokenUser.username || !tokenUser.role) {
      return next(new AuthError("Token inválido o malformado"));
    }

    // --- Active Session Validation ---
    // Skip session check for Kiosk (short-lived tokens)
    if (tokenUser.role === "Kiosk_Employee") {
      req.user = tokenUser;
      return next();
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const session = await prisma.activeSession.findUnique({
      where: { tokenHash },
    });

    if (!session) {
      return next(new AuthError("Sesión cerrada o invalidada desde otro dispositivo"));
    }

    if (session.expiresAt < new Date()) {
      await prisma.activeSession.delete({ where: { id: session.id } }).catch(() => {});
      return next(new AuthError("Sesión expirada"));
    }

    // Best-effort activity update (avoid hot-loop writes)
    const now = new Date();
    if (session.lastActive.getTime() < now.getTime() - 60 * 1000) {
      prisma.activeSession
        .update({ where: { id: session.id }, data: { lastActive: now } })
        .catch(() => {});
    }

    const persistedUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        username: true,
        role: true,
        employeeId: true,
      },
    });

    const user = persistedUser
      ? {
          id: persistedUser.id,
          username: persistedUser.username,
          role: persistedUser.role,
          employeeId: persistedUser.employeeId ?? null,
        }
      : tokenUser;

    req.user = user;

    // Wrap the rest of the request in the context to propagate the username
    // to the database layer for auditing.
    return requestContext.run({ username: user.username }, () => {
      next();
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
        return next(new AuthError("Token inválido o expirado"));
      }
    }
    console.error("Authentication check failed:", err);
    return next(err);
  }
};

export const authorizeAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== "Administrador") {
    throw new ForbiddenError("Acceso denegado: Se requieren permisos de Administrador");
  }
  next();
};

export const authorizeElevated = (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = req.user?.role;
  if (role !== "Administrador" && role !== "Supervisor_Elevado") {
    throw new ForbiddenError(
      "Acceso denegado: Se requieren permisos de nivel superior (Administrador o Supervisor Elevado)",
    );
  }
  next();
};

// Read-only access to audit logs for auditors (Fiscalizador) and elevated roles.
export const authorizeAuditViewer = (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = req.user?.role;
  const allowedRoles = ["Administrador", "Supervisor_Elevado", "Fiscalizador"];
  if (!role || !allowedRoles.includes(role)) {
    throw new ForbiddenError("Acceso denegado: Se requieren permisos de auditoría");
  }
  next();
};

export const authorizeSupervisor = (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = req.user?.role;
  const allowedRoles = ["Administrador", "Supervisor_Elevado", "Supervisor", "Reloj_Control"];
  if (!role || !allowedRoles.includes(role)) {
    throw new ForbiddenError("Acceso denegado: Se requieren permisos de Supervisor o superior");
  }
  next();
};

export const authorizeCorrectionResolver = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const role = req.user?.role;
  const allowedRoles = ["Administrador", "Supervisor_Elevado", "Supervisor"];
  if (!role || !allowedRoles.includes(role)) {
    throw new ForbiddenError(
      "Acceso denegado: Solo Supervisor, Supervisor Elevado o Administrador pueden resolver correcciones",
    );
  }
  next();
};

export const authorizeMasterDataExporter = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const role = req.user?.role;
  const allowedRoles = ["Administrador", "Fiscalizador"];
  if (!role || !allowedRoles.includes(role)) {
    throw new ForbiddenError(
      "Acceso denegado: Se requieren permisos de Administrador o Fiscalizador",
    );
  }
  next();
};

export const authorizeKiosk = (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = req.user?.role;
  const allowedRoles = ["Administrador", "Supervisor_Elevado", "Supervisor", "Kiosk_Employee"];
  if (!role || !allowedRoles.includes(role)) {
    throw new ForbiddenError("Acceso denegado: Acción reservada para Kiosko o Supervisores");
  }
  next();
};
