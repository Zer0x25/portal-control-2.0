import prisma, { withDirectTransaction } from "./db";
import bcrypt from "bcryptjs";
import { ulid } from "ulid";
import { SocketService } from "./socketService";
import { auditService } from "./auditService";
import { UserRole, Prisma } from "../generated/prisma/client";

import {
  toPublicUser,
  createUserFlows,
  mapUserRole,
  type UserFlowDependencies,
  type CreateUserDto,
  type UpdateUserDto,
  type UserQuery,
} from "../modules/users";
export type { CreateUserDto, UpdateUserDto } from "../modules/users";

// Public reads and mutation results never fetch credential/security columns.
const publicUserSelect = {
  id: true,
  username: true,
  role: true,
  employeeId: true,
  isForcePasswordChange: true,
  mfaEnabled: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

type DbClient = Pick<Prisma.TransactionClient, "user"> | Pick<typeof prisma, "user">;

interface EnsureEmployeeUserDto {
  employeeId: string;
  fullName: string;
  role?: string;
  defaultPassword?: string;
}

export class UserService {
  private normalizeFullName(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private buildEmployeeUsernameBase(fullName: string): string {
    const cleanName = this.normalizeFullName(fullName);
    const parts = cleanName.split(" ").filter(Boolean);
    const firstName = parts[0] || "";
    const firstSurname = parts[1] || "";

    let baseAlias = "";
    if (firstName && firstSurname) {
      baseAlias = `${firstName.charAt(0)}${firstSurname.slice(0, 5)}`;
    } else {
      baseAlias = firstName.slice(0, 6);
    }

    baseAlias = baseAlias.replace(/[^A-Z0-9]/g, "");
    return baseAlias || "USER";
  }

  private async generateUniqueEmployeeUsername(fullName: string, db: DbClient): Promise<string> {
    const baseAlias = this.buildEmployeeUsernameBase(fullName);
    let finalAlias = baseAlias;
    let counter = 2;

    while (
      await db.user.findFirst({
        where: { username: finalAlias.toLowerCase() },
        select: { id: true },
      })
    ) {
      finalAlias = `${baseAlias}${String(counter).padStart(2, "0")}`;
      counter++;
    }

    return finalAlias.toLowerCase();
  }

  public mapRoleFromFrontend(role: string): UserRole {
    return mapUserRole(role) as UserRole;
  }

  private mapRoleToFrontend(role: string): string {
    if (!role) return "Usuario";
    return role.replace(/_/g, " ");
  }

  private async listUsers(params: UserQuery) {
    const { since, requesterRole, requesterId, search, role, page, pageSize } = params;
    const where: Prisma.UserWhereInput = {};

    if (since) {
      const sinceDate = new Date(Number(since));
      if (!isNaN(sinceDate.getTime())) {
        where.createdAt = { gte: sinceDate };
      }
    }

    if (requesterRole === "Usuario" && requesterId) {
      where.id = requesterId;
    }

    if (search) {
      const searchStr = String(search).trim();
      where.OR = [
        { username: { contains: searchStr, mode: "insensitive" } },
        {
          employee: {
            name: { contains: searchStr, mode: "insensitive" },
          },
        },
      ];
    }

    if (role && role !== "Todos") {
      where.role = this.mapRoleFromFrontend(role);
    }

    // Pagination Logic
    const isPaginated = page !== undefined && pageSize !== undefined;
    const take = isPaginated ? Number(pageSize) : undefined;
    const skip = isPaginated ? (Number(page) - 1) * Number(pageSize) : undefined;

    const [rawUsers, total] = await Promise.all([
      prisma.user.findMany({
        select: publicUserSelect,
        where,
        orderBy: { username: "asc" },
        take,
        skip,
      }),
      prisma.user.count({ where }),
    ]);

    return { users: rawUsers, total };
  }

  private readonly flows = createUserFlows({
    repository: {
      list: (query) => this.listUsers(query),
      create: (data) =>
        prisma.user.create({
          select: publicUserSelect,
          data: { ...data, role: this.mapRoleFromFrontend(data.role) },
        }),
      update: (id, data) => {
        const { employeeId, role, ...fields } = data;
        const update: Prisma.UserUpdateInput = { ...fields };
        if (role !== undefined) update.role = this.mapRoleFromFrontend(role);
        if (employeeId !== undefined)
          update.employee = employeeId ? { connect: { id: employeeId } } : { disconnect: true };
        return prisma.user.update({ select: publicUserSelect, where: { id }, data: update });
      },
      findUsername: (id) => prisma.user.findUnique({ where: { id }, select: { username: true } }),
      delete: async (id) => {
        await prisma.user.delete({ where: { id } });
      },
    },
    hash: (password) => bcrypt.hashSync(password, 10),
    id: ulid,
    audit: (entry) => auditService.log(entry),
    emit: (user) => SocketService.emit("user:updated", user),
  } satisfies UserFlowDependencies);

  getAllUsers(query: UserQuery) {
    return this.flows.getAllUsers(query);
  }
  createUser(data: CreateUserDto, actor: string) {
    return this.flows.createUser(data, actor);
  }
  updateUser(id: string, data: UpdateUserDto, actor: string) {
    return this.flows.updateUser(id, data, actor);
  }
  deleteUser(id: string, actor: string) {
    return this.flows.deleteUser(id, actor);
  }

  async ensureEmployeeUser(
    data: EnsureEmployeeUserDto,
    actorUsername: string,
    db: DbClient = prisma,
  ) {
    const existingLinkedUser = await db.user.findFirst({
      select: publicUserSelect,
      where: { employeeId: data.employeeId },
    });

    if (existingLinkedUser) return toPublicUser(existingLinkedUser);

    const username = await this.generateUniqueEmployeeUsername(data.fullName, db);
    const passwordHash = bcrypt.hashSync(data.defaultPassword || "123456", 10);

    const createdUser = await db.user.create({
      select: publicUserSelect,
      data: {
        id: ulid(),
        username,
        passwordHash,
        role: this.mapRoleFromFrontend(data.role || "Usuario"),
        employeeId: data.employeeId,
        isForcePasswordChange: true,
      },
    });

    await auditService.log({
      actorUsername,
      action: "USER_CREATE",
      category: "OPERATIONS",
      details: { username: createdUser.username, role: this.mapRoleToFrontend(createdUser.role) },
    });

    const publicUser = toPublicUser(createdUser);
    SocketService.emit("user:updated", publicUser);
    return publicUser;
  }

  async forceResetPassword(username: string, newPassword: string, actorUsername: string) {
    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    const result = await withDirectTransaction(async (tx) => {
      // UPDATE takes the same row lock as session issuance and MFA validation.
      const user = await tx.user.update({
        where: { username: username.toLowerCase() },
        data: { passwordHash: hashedPassword, isForcePasswordChange: true },
        select: { id: true },
      });
      const revoked = await tx.activeSession.deleteMany({ where: { userId: user.id } });
      return { userId: user.id, invalidatedSessions: revoked.count };
    });

    await auditService.log({
      actorUsername,
      action: "FORCE_PASSWORD_RESET",
      category: "OPERATIONS",
      severity: "CRITICAL",
      details: { targetUser: username, invalidatedSessions: result.invalidatedSessions },
    });
    // Existing delivery revalidates sessions before events and disconnects revoked sockets.
    SocketService.emit("user:updated", { id: result.userId });
  }
}

export const userService = new UserService();
