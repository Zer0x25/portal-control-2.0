// backend/src/modules/auth/infrastructure/sessionAdapter.ts
import type { AuthUser } from "../application/authenticate";

export function sessionDurationHoursForRole(role: string): number {
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

export function sessionLimitForRole(role: string): number {
  if (role === "Administrador") return 10;
  if (role === "Reloj_Control") return 2;
  return 1;
}

export function mapBetterAuthSession(user: AuthUser, now: Date) {
  const hours = sessionDurationHoursForRole(user.role);
  return {
    hours,
    limit: sessionLimitForRole(user.role),
    expiresAt: new Date(now.getTime() + hours * 3600_000),
  };
}
