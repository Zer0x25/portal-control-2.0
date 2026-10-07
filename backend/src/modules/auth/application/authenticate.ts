import { AuthError } from "../../../utils/AppError";
export interface AuthUser {
  id: string;
  username: string;
  role: string;
  employeeId?: string | null;
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
export function createAuthenticate(deps: AuthenticationDependencies) {
  return async (token: string | undefined): Promise<AuthUser> => {
    if (!token) throw new AuthError("Token de acceso no proporcionado");
    let user: AuthUser;
    try {
      user = deps.verify(token);
    } catch (error) {
      if (error instanceof Error && ["JsonWebTokenError", "TokenExpiredError"].includes(error.name))
        throw new AuthError("Token inválido o expirado");
      throw error;
    }
    if (user.role === "Kiosk_Employee") return user;
    const session = await deps.sessions.find(deps.hash(token));
    if (!session) throw new AuthError("Sesión cerrada o invalidada desde otro dispositivo");
    if (session.expiresAt < deps.now()) {
      await deps.sessions.remove(session.id).catch(() => {});
      throw new AuthError("Sesión expirada");
    }
    const now = deps.now();
    if (session.lastActive.getTime() < now.getTime() - 60000)
      void deps.sessions.touch(session.id, now).catch(() => {});
    return (await deps.users.find(session.userId)) || user;
  };
}
