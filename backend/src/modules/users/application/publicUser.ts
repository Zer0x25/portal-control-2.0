export interface UserProjection {
  id: string;
  username: string;
  role: string;
  employeeId: string | null;
  isForcePasswordChange: boolean;
  mfaEnabled: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
export interface PublicUser {
  id: string;
  username: string;
  role: string;
  employeeId: string | null;
  mustChangePassword: boolean;
  mfaEnabled: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}
/** Explicit allowlist: database columns never become public by object spread. */
export function toPublicUser(user: UserProjection): PublicUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role.replace(/_/g, " "),
    employeeId: user.employeeId,
    mustChangePassword: user.isForcePasswordChange,
    mfaEnabled: user.mfaEnabled,
    lastLogin: user.lastLogin?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
