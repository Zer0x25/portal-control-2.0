import { AuthError, ForbiddenError } from "../../../utils/AppError";
export interface AuthUser {
  id: string;
  username: string;
  role: string;
  employeeId?: string | null;
  jti?: string | null;
  isForcePasswordChange?: boolean;
}
export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: Date;
  lastActive: Date;
}
export interface AuthenticationDependencies {
  verify(token: string): AuthUser;
  hash(token: string): string;
  now(): Date;
  sessions: {
    find(hash: string): Promise<AuthSession | null>;
    remove(id: string): Promise<unknown>;
    touch(id: string, now: Date): Promise<unknown>;
  };
  users: { find(id: string): Promise<AuthUser | null> };
  employees?: {
    findStatus(id: string): Promise<{ status: string; isPinBlocked?: boolean } | null>;
  };
  kioskSessions?: { isActive(jti: string): Promise<boolean> };
  betterAuth?: {
    enabled: boolean;
    findSession(token: string): Promise<AuthSession | null>;
  };
}
interface KioskAllowedRule {
  method: "GET" | "POST" | "PUT";
  match: (cleanPath: string, query: URLSearchParams, user: AuthUser) => boolean;
}
const KIOSK_ALLOWED_PATHS: readonly KioskAllowedRule[] = [
  {
    method: "POST",
    match: (cleanPath) => cleanPath === "/api/records/punch",
  },
  {
    method: "GET",
    match: (cleanPath, query, user) => {
      if (cleanPath !== "/api/records") return false;
      const requestedEmployeeIds = query.getAll("employeeId");
      if (requestedEmployeeIds.length === 0) return true;
      const selfId = user.employeeId ?? user.id;
      return requestedEmployeeIds.every((id) => id === selfId);
    },
  },
  {
    method: "PUT",
    match: (cleanPath, _query, user) => {
      const match = /^\/api\/employees\/([^/]+)$/.exec(cleanPath);
      if (!match) return false;
      const selfId = user.employeeId ?? user.id;
      return match[1] === selfId;
    },
  },
  {
    method: "POST",
    match: (cleanPath) => cleanPath === "/api/auth/logout",
  },
];

function normalizePathAndQuery(requestPath: string): {
  cleanPath: string;
  query: URLSearchParams;
} {
  const [rawPath, rawQuery = ""] = requestPath.split("?");
  const cleanPath = rawPath.replace(/\/+$/, "") || "/";
  return { cleanPath, query: new URLSearchParams(rawQuery) };
}

function assertAllowedWhileForcePasswordChange(
  user: AuthUser,
  requestPath?: string,
  requestMethod?: string,
) {
  if (!user.isForcePasswordChange) return;
  if (!requestPath) {
    throw new ForbiddenError("Debe actualizar su contraseña temporal antes de continuar");
  }
  const { cleanPath } = normalizePathAndQuery(requestPath);
  const method = requestMethod?.toUpperCase();
  const isSelfUserUpdate =
    cleanPath === `/api/users/${user.id}` && (method === undefined || method === "PUT");
  const isLogout = cleanPath === "/api/auth/logout" && (method === undefined || method === "POST");
  const isHealth = cleanPath === "/api/health" || cleanPath.startsWith("/api/health/");
  if (!isSelfUserUpdate && !isLogout && !isHealth) {
    throw new ForbiddenError("Debe actualizar su contraseña temporal antes de continuar");
  }
}

export function createAuthenticate(deps: AuthenticationDependencies) {
  return async (
    token: string | undefined,
    requestPath?: string,
    requestMethod?: string,
  ): Promise<AuthUser> => {
    if (!token) throw new AuthError("Token de acceso no proporcionado");
    // Dual-mode strangler fig: con flag, primero prueba sesión better-auth
    // (token opaco en sessions.token). Si existe, resuelve usuario sin JWT.
    if (deps.betterAuth?.enabled) {
      const baSession = await deps.betterAuth.findSession(token).catch(() => null);
      if (baSession) {
        if (baSession.expiresAt < deps.now()) throw new AuthError("Sesión expirada");
        const baUser = await deps.users.find(baSession.userId);
        if (!baUser) throw new AuthError("Usuario no encontrado");
        if (baUser.role === "Archivado") {
          throw new ForbiddenError("Acceso denegado: Su cuenta de usuario está archivada");
        }
        assertAllowedWhileForcePasswordChange(baUser, requestPath, requestMethod);
        return baUser;
      }
    }
    let user: AuthUser;
    try {
      user = deps.verify(token);
    } catch (error) {
      if (error instanceof Error && ["JsonWebTokenError", "TokenExpiredError"].includes(error.name))
        throw new AuthError("Token inválido o expirado");
      throw error;
    }
    if (user.role === "Kiosk_Employee") {
      if (deps.employees) {
        const employeeId = user.employeeId ?? user.id;
        const employee = await deps.employees.findStatus(employeeId);
        if (!employee || employee.status !== "Activo") {
          throw new ForbiddenError("Acceso denegado: Empleado archivado o inactivo");
        }
        if (employee.isPinBlocked) {
          throw new ForbiddenError("Acceso denegado: PIN bloqueado");
        }
      }
      if (deps.kioskSessions) {
        if (!user.jti || !(await deps.kioskSessions.isActive(user.jti))) {
          throw new AuthError("Sesión de kiosco cerrada o expirada");
        }
      }
      if (requestPath) {
        const { cleanPath, query } = normalizePathAndQuery(requestPath);
        const method = requestMethod?.toUpperCase();
        const allowed = KIOSK_ALLOWED_PATHS.some(
          (rule) => (!method || rule.method === method) && rule.match(cleanPath, query, user),
        );
        if (!allowed) {
          throw new ForbiddenError("Token de kiosco no autorizado para este recurso");
        }
      }
      return user;
    }
    const session = await deps.sessions.find(deps.hash(token));
    if (!session) throw new AuthError("Sesión cerrada o invalidada desde otro dispositivo");
    if (session.expiresAt < deps.now()) {
      await deps.sessions.remove(session.id).catch(() => {});
      throw new AuthError("Sesión expirada");
    }
    const now = deps.now();
    if (session.lastActive.getTime() < now.getTime() - 60000)
      await deps.sessions.touch(session.id, now).catch(() => {});
    const dbUser = await deps.users.find(session.userId);
    if (!dbUser) throw new AuthError("Usuario no encontrado");
    if (dbUser.role === "Archivado") {
      throw new ForbiddenError("Acceso denegado: Su cuenta de usuario está archivada");
    }
    assertAllowedWhileForcePasswordChange(dbUser, requestPath, requestMethod);
    return dbUser;
  };
}
