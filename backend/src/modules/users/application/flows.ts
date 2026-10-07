import { toPublicUser, type UserProjection, type PublicUser } from "./publicUser";
export interface CreateUserDto {
  id?: string;
  username: string;
  password?: string;
  role: string;
  employeeId?: string;
}
export interface UpdateUserDto {
  username?: string;
  password?: string;
  role?: string;
  employeeId?: string;
  mustChangePassword?: boolean;
  isForcePasswordChange?: boolean;
}
export interface UserQuery {
  since?: string | number;
  requesterRole?: string;
  requesterId?: string;
  search?: string;
  role?: string;
  page?: number;
  pageSize?: number;
}
export interface UserWrite {
  username?: string;
  passwordHash?: string;
  role?: string;
  employeeId?: string;
  isForcePasswordChange?: boolean;
}
export interface UserFlowDependencies {
  repository: {
    list(query: UserQuery): Promise<{ users: UserProjection[]; total: number }>;
    create(
      data: UserWrite & { id: string; username: string; passwordHash: string; role: string },
    ): Promise<UserProjection>;
    update(id: string, data: UserWrite): Promise<UserProjection>;
    findUsername(id: string): Promise<{ username: string } | null>;
    delete(id: string): Promise<void>;
  };
  hash(password: string): string;
  id(): string;
  audit(entry: {
    actorUsername: string;
    action: string;
    category: string;
    severity?: "INFO" | "WARNING";
    details: Record<string, unknown>;
  }): Promise<void>;
  emit(user: PublicUser | { id: string; isDeleted: true }): void;
}
export function mapUserRole(role: string): string {
  const roles: Record<string, string> = {
    Empleado: "Usuario",
    "Reloj Control": "Reloj_Control",
    "Supervisor Elevado": "Supervisor_Elevado",
  };
  return roles[role] || role || "Usuario";
}
export function createUserFlows(deps: UserFlowDependencies) {
  return {
    async getAllUsers(query: UserQuery) {
      const result = await deps.repository.list(query);
      return {
        users: result.users.map((user) => ({
          ...toPublicUser(user),
          syncStatus: "synced",
          lastModified: user.updatedAt.getTime(),
          isDeleted: false,
        })),
        total: result.total,
        isPaginated: query.page !== undefined && query.pageSize !== undefined,
      };
    },
    async createUser(input: CreateUserDto, actorUsername: string) {
      const user = await deps.repository.create({
        id: input.id || deps.id(),
        username: input.username.toLowerCase(),
        passwordHash: deps.hash(input.password || "123456"),
        role: mapUserRole(input.role),
        employeeId: input.employeeId,
        isForcePasswordChange: true,
      });
      const result = toPublicUser(user);
      await deps.audit({
        actorUsername,
        action: "USER_CREATE",
        category: "OPERATIONS",
        details: { username: result.username, role: result.role },
      });
      deps.emit(result);
      return result;
    },
    async updateUser(id: string, input: UpdateUserDto, actorUsername: string) {
      const data: UserWrite = {};
      if (input.username) data.username = input.username.toLowerCase();
      if (input.password) data.passwordHash = deps.hash(input.password);
      if (
        input.password &&
        input.mustChangePassword === undefined &&
        input.isForcePasswordChange === undefined
      )
        data.isForcePasswordChange = false;
      if (input.role) data.role = mapUserRole(input.role);
      if (input.employeeId !== undefined) data.employeeId = input.employeeId;
      if (input.mustChangePassword !== undefined)
        data.isForcePasswordChange = input.mustChangePassword;
      if (input.isForcePasswordChange !== undefined)
        data.isForcePasswordChange = input.isForcePasswordChange;
      const user = await deps.repository.update(id, data);
      const result = toPublicUser(user);
      // Keep the legacy audit's Prisma relation field name without importing Prisma.
      const updatedFields = Object.keys(data).map((field) =>
        field === "employeeId" ? "employee" : field,
      );
      await deps.audit({
        actorUsername,
        action: "USER_UPDATE",
        category: "OPERATIONS",
        severity: "INFO",
        details: { userId: id, username: user.username, updatedFields },
      });
      deps.emit(result);
      return result;
    },
    async deleteUser(id: string, actorUsername: string) {
      const user = await deps.repository.findUsername(id);
      await deps.repository.delete(id);
      await deps.audit({
        actorUsername,
        action: "USER_DELETE",
        category: "OPERATIONS",
        severity: "WARNING",
        details: { id, username: user?.username },
      });
      deps.emit({ id, isDeleted: true });
    },
  };
}
export type UserFlows = ReturnType<typeof createUserFlows>;
