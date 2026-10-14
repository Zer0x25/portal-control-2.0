import { AuthError, ForbiddenError } from "../../../utils/AppError";
export interface AuthUser {
  id: string;
  username: string;
  role: string;
  employeeId?: string | null;
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
}
const KIOSK_ALLOWED_PATHS = [
  "/api/records/punch",
  "/api/records",
  "/api/employees/",
  "/api/auth/logout",
];
export function createAuthenticate(deps: AuthenticationDependencies) {
  return async (token: string | undefined, requestPath?: string): Promise<AuthUser> => {
    if (!token) throw new AuthError("Token de acceso no proporcionado");
    let user: AuthUser;
    try {
      user = deps.verify(token);
    } catch (error) {
      if (error instanceof Error && ["JsonWebTokenError", "TokenExpiredError"].includes(error.name))
        throw new AuthError("Token inválido o expirado");
      throw error;
    }
    if (user.role === "Kiosk_Employee") {
      if (requestPath) {
        const cleanPath = requestPath.split("?")[0];
        const allowed = KIOSK_ALLOWED_PATHS.some(
          (prefix) => cleanPath === prefix || cleanPath.startsWith(prefix),
        );
        if (!allowed) {
          throw new ForbiddenError("Token de kiosco no autorizado para este recurso");
        }
      }
      return { ...user, employeeId: user.id };
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
    if (dbUser.isForcePasswordChange && requestPath) {
      const cleanPath = requestPath.split("?")[0];
      const allowedWhileForced =
        cleanPath.startsWith("/api/auth/") || cleanPath === "/api/users/" + dbUser.id;
      if (!allowedWhileForced) {
        throw new ForbiddenError("Debe actualizar su contraseña temporal antes de continuar");
      }
    }
    return dbUser;
  };
}
