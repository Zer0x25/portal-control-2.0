import prisma from "./db";
import bcrypt from "bcryptjs";
import { ulid } from "ulid";
import { SocketService } from "./socketService";
import { auditService } from "./auditService";
import { UserRole, Prisma } from "../generated/prisma/client";

export interface CreateUserDto {
  id?: string;
  username: string;
  password?: string;
  role: string;
  employeeId: string;
}

export interface UpdateUserDto {
  username?: string;
  password?: string;
  role?: string;
  employeeId?: string;
  mustChangePassword?: boolean;
  isForcePasswordChange?: boolean;
}

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
    if (!role) return "Usuario";
    const roleMap: Record<string, UserRole> = {
      Empleado: "Usuario",
      Usuario: "Usuario",
      "Reloj Control": "Reloj_Control",
      Reloj_Control: "Reloj_Control",
      Supervisor: "Supervisor",
      Administrador: "Administrador",
      "Supervisor Elevado": "Supervisor_Elevado",
      Supervisor_Elevado: "Supervisor_Elevado",
      Fiscalizador: "Fiscalizador",
      Archivado: "Archivado",
    };
    return roleMap[role] || (role as UserRole);
  }

  private mapRoleToFrontend(role: string): string {
    if (!role) return "Usuario";
    return role.replace(/_/g, " ");
  }

  async getAllUsers(params: {
    since?: string;
    requesterRole?: string;
    requesterId?: string;
    search?: string;
    role?: string;
    page?: number;
    pageSize?: number;
  }) {
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
        where,
        orderBy: { username: "asc" },
        take,
        skip,
      }),
      prisma.user.count({ where }),
    ]);

    const mappedUsers = rawUsers.map((user) => {
      const { isForcePasswordChange, ...rest } = user;
      return {
        ...rest,
        role: this.mapRoleToFrontend(user.role),
        mustChangePassword: isForcePasswordChange,
        syncStatus: "synced",
        lastModified: user.updatedAt.getTime(),
        isDeleted: false,
      };
    });

    return {
      users: mappedUsers,
      total,
      isPaginated,
    };
  }

  async createUser(data: CreateUserDto, actorUsername: string) {
    const hashedPassword = bcrypt.hashSync(data.password || "123456", 10);

    const user = await prisma.user.create({
      data: {
        id: data.id || ulid(),
        username: data.username.toLowerCase(),
        passwordHash: hashedPassword,
        role: this.mapRoleFromFrontend(data.role),
        employeeId: data.employeeId,
        isForcePasswordChange: true,
      },
    });

    const enriched = {
      ...user,
      role: this.mapRoleToFrontend(user.role),
    };

    await auditService.log({
      actorUsername,
      action: "USER_CREATE",
      category: "OPERATIONS",
      details: { username: enriched.username, role: enriched.role },
    });

    SocketService.emit("user:updated", enriched);
    return enriched;
  }

  async ensureEmployeeUser(
    data: EnsureEmployeeUserDto,
    actorUsername: string,
    db: DbClient = prisma,
  ) {
    const existingLinkedUser = await db.user.findFirst({
      where: { employeeId: data.employeeId },
    });

    if (existingLinkedUser) {
      return {
        ...existingLinkedUser,
        role: this.mapRoleToFrontend(existingLinkedUser.role),
        mustChangePassword: existingLinkedUser.isForcePasswordChange,
      };
    }

    const username = await this.generateUniqueEmployeeUsername(data.fullName, db);
    const passwordHash = bcrypt.hashSync(data.defaultPassword || "123456", 10);

    const createdUser = await db.user.create({
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

    SocketService.emit("user:updated", {
      ...createdUser,
      role: this.mapRoleToFrontend(createdUser.role),
    });

    return {
      ...createdUser,
      role: this.mapRoleToFrontend(createdUser.role),
      mustChangePassword: createdUser.isForcePasswordChange,
    };
  }

  async updateUser(id: string, data: UpdateUserDto, actorUsername: string) {
    const dataToUpdate: Prisma.UserUpdateInput = {};
    if (data.username) dataToUpdate.username = data.username.toLowerCase();
    if (data.password) dataToUpdate.passwordHash = bcrypt.hashSync(data.password, 10);
    // Spec 002 H-06: si el usuario fija su propia contraseña y nadie pidió
    // forzar cambio explícitamente, el flag forzado queda saldado.
    if (
      data.password &&
      data.mustChangePassword === undefined &&
      data.isForcePasswordChange === undefined
    ) {
      dataToUpdate.isForcePasswordChange = false;
    }
    if (data.role) dataToUpdate.role = this.mapRoleFromFrontend(data.role);
    if (data.employeeId !== undefined) {
      if (data.employeeId) {
        dataToUpdate.employee = { connect: { id: data.employeeId } };
      } else {
        dataToUpdate.employee = { disconnect: true };
      }
    }
    if (data.mustChangePassword !== undefined)
      dataToUpdate.isForcePasswordChange = data.mustChangePassword;
    if (data.isForcePasswordChange !== undefined)
      dataToUpdate.isForcePasswordChange = data.isForcePasswordChange;

    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });

    const enriched = {
      ...updated,
      role: this.mapRoleToFrontend(updated.role),
      mustChangePassword: updated.isForcePasswordChange,
    };

    await auditService.log({
      actorUsername,
      action: "USER_UPDATE",
      category: "OPERATIONS",
      severity: "INFO",
      details: {
        userId: id,
        username: updated.username,
        updatedFields: Object.keys(dataToUpdate),
      },
    });

    SocketService.emit("user:updated", enriched);
    return enriched;
  }

  async deleteUser(id: string, actorUsername: string) {
    const user = await prisma.user.findUnique({ where: { id }, select: { username: true } });
    await prisma.user.delete({ where: { id } });

    await auditService.log({
      actorUsername,
      action: "USER_DELETE",
      category: "OPERATIONS",
      severity: "WARNING",
      details: { id, username: user?.username },
    });

    SocketService.emit("user:updated", { id, isDeleted: true });
  }

  async forceResetPassword(username: string, newPassword: string, actorUsername: string) {
    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    await prisma.user.update({
      where: { username: username.toLowerCase() },
      data: {
        passwordHash: hashedPassword,
        isForcePasswordChange: true, // Standard practice to force change after admin reset
      },
    });

    await auditService.log({
      actorUsername,
      action: "FORCE_PASSWORD_RESET",
      category: "OPERATIONS",
      severity: "CRITICAL",
      details: { targetUser: username },
    });
  }
}

export const userService = new UserService();
