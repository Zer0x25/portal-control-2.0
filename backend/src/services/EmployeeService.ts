import prisma from "./db";
import { Prisma, EmployeeStatus } from "../generated/prisma/client";
import bcryptjs from "bcryptjs";
import { auditService } from "./auditService";
import { addBusinessDaysChile, toBusinessDateChile } from "../utils/timeUtils";
import type { AuthUser } from "../modules/auth";

const EMPLOYEE_ID_PREFIX = "EMP-";
const EMPLOYEE_ID_BASE = 1000;
type EmployeeDbClient =
  Pick<Prisma.TransactionClient, "employee"> | Pick<typeof prisma, "employee">;

/** Role fields `listEmployees` reads for row-level scoping. */
type EmployeeListAuthUser = Partial<Pick<AuthUser, "role" | "employeeId">>;

/**
 * Filter fields read by `listEmployees`. HTTP query values arrive untyped and
 * may repeat, so the raw input is also accepted and narrowed per field.
 */
export interface EmployeeListQuery {
  since?: string;
  page?: number | string;
  pageSize?: number | string;
  search?: string;
  status?: EmployeeStatus | "Todos" | string;
  area?: string;
}

/** Untrusted filter source, e.g. `req.query`. */
export type EmployeeListQueryInput = EmployeeListQuery | Record<string, unknown>;

/** Payload fields `createEmployee` reads. */
export interface EmployeeCreateData {
  id?: string;
  name: string;
  rut: string;
  email?: string | null;
  position: string;
  area: string;
  workdayType: string;
  status?: EmployeeStatus | string;
  pin?: string | null;
}

/** Payload fields `updateEmployee` reads; every field is optional (partial edit). */
export interface EmployeeUpdateData {
  name?: string;
  email?: string | null;
  position?: string;
  area?: string;
  workdayType?: string;
  status?: EmployeeStatus | string;
  pin?: string | null;
  isPinBlocked?: boolean;
  pinFailedAttempts?: number;
}

/** Row shape of a bulk import; same fields as a create payload. */
export interface BulkEmployeeInput {
  id: string;
  name: string;
  rut: string;
  email?: string | null;
  position: string;
  area: string;
  workdayType: string;
  status?: EmployeeStatus | string;
  pin?: string | null;
}

export class EmployeeService {
  /**
   * Resuelve o genera un nuevo ID de empleado correlativo.
   */
  async resolveEmployeeId(inputId?: string): Promise<string> {
    if (inputId && inputId.trim().length > 0) return inputId.trim().toUpperCase();

    const latest = await prisma.employee.findFirst({
      where: { id: { startsWith: EMPLOYEE_ID_PREFIX } },
      orderBy: { id: "desc" },
      select: { id: true },
    });

    const current =
      latest && latest.id.includes("-")
        ? Number(latest.id.split("-")[1]) || EMPLOYEE_ID_BASE
        : EMPLOYEE_ID_BASE;
    return `${EMPLOYEE_ID_PREFIX}${current + 1}`;
  }

  /**
   * Sincroniza el estado del empleado con otros módulos (Turnos, Permisos, Usuarios).
   * Se ejecuta principalmente al archivar o desarchivar.
   */
  async syncEmployeeStatus(
    id: string,
    oldStatus: EmployeeStatus,
    newStatus: EmployeeStatus,
    updatedName: string,
    updatedRut: string,
  ) {
    if (oldStatus === newStatus) return;

    if (newStatus === "Archivado") {
      const today = toBusinessDateChile();
      const yesterday = addBusinessDaysChile(today, -1);

      // 1. Terminate Ongoing assignments
      const activeAssignments = await prisma.assignedShift.findMany({
        where: {
          employeeId: id,
          isDeleted: false,
          startDate: { lte: today },
          OR: [{ endDate: null }, { endDate: { gte: today } }],
        },
      });

      if (activeAssignments.length > 0) {
        const patterns = await prisma.shiftPattern.findMany({
          where: { id: { in: activeAssignments.map((a) => a.shiftPatternId) } },
        });

        await prisma.$transaction(
          activeAssignments.map((as) => {
            const pattern = patterns.find((p) => p.id === as.shiftPatternId);
            return prisma.assignedShift.update({
              where: { id: as.id },
              data: {
                endDate: yesterday,
                employeeName: updatedName,
                shiftPatternName: pattern?.name || as.shiftPatternName,
              },
            });
          }),
        );
      }

      // 2. Soft-delete future assignments
      await prisma.assignedShift.updateMany({
        where: {
          employeeId: id,
          startDate: { gt: today },
          isDeleted: false,
        },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      // 3. Leaves Integrity
      await prisma.leaveRecord.deleteMany({
        where: {
          employeeId: id,
          startDate: { gt: today },
        },
      });

      const activeLeaves = await prisma.leaveRecord.findMany({
        where: {
          employeeId: id,
          startDate: { lte: today },
          endDate: { gt: today },
        },
      });

      if (activeLeaves.length > 0) {
        await prisma.$transaction(
          activeLeaves.map((leave) =>
            prisma.leaveRecord.update({
              where: { id: leave.id },
              data: { endDate: today },
            }),
          ),
        );
      }

      // 4. User Sync
      const user = await prisma.user.findFirst({ where: { employeeId: id } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "Archivado" },
        });
      }
    } else if (newStatus === "Activo" && oldStatus === "Archivado") {
      // Un-archive User and reset credentials
      const user = await prisma.user.findFirst({ where: { employeeId: id } });
      if (user) {
        const defaultPassword = bcryptjs.hashSync("123456", 10);
        const defaultPin = updatedRut.slice(0, 4);

        await prisma.user.update({
          where: { id: user.id },
          data: {
            role: "Usuario",
            passwordHash: defaultPassword,
            isForcePasswordChange: true,
          },
        });

        await prisma.employee.update({
          where: { id },
          data: {
            pin: defaultPin,
            pinFailedAttempts: 0,
            isPinBlocked: false,
          },
        });
      }
    }
  }

  /**
   * Obtiene y pagina empleados con filtros.
   */
  async listEmployees(
    query: EmployeeListQueryInput,
    authUser?: EmployeeListAuthUser,
    isPublicKiosk?: boolean,
  ) {
    const { since, page, pageSize, search, status, area } = query as EmployeeListQuery;
    const where: Prisma.EmployeeWhereInput = {};

    if (since) {
      const sinceDate = new Date(Number(since));
      if (!isNaN(sinceDate.getTime())) {
        where.updatedAt = { gte: sinceDate };
      }
    }

    if (authUser?.role === "Usuario" && authUser.employeeId) {
      where.id = authUser.employeeId;
    }

    if (search) {
      const searchStr = String(search).trim();
      where.OR = [
        { name: { contains: searchStr, mode: "insensitive" } },
        { rut: { contains: searchStr, mode: "insensitive" } },
        { position: { contains: searchStr, mode: "insensitive" } },
      ];
    }

    if (status && status !== "Todos") {
      where.status = status as EmployeeStatus;
    }

    if (area && area !== "Todas") {
      where.area = area as string;
    }

    if (isPublicKiosk) {
      where.status = "Activo";
    }

    const isPaginated = page !== undefined && pageSize !== undefined;
    const take = isPaginated ? Number(pageSize) : undefined;
    const skip = isPaginated ? (Number(page) - 1) * Number(pageSize) : undefined;

    const [rawEmployees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        orderBy: { name: "asc" },
        take,
        skip,
      }),
      prisma.employee.count({ where }),
    ]);

    return { rawEmployees, total };
  }

  async getEmployeeById(id: string) {
    return await prisma.employee.findUnique({ where: { id } });
  }

  async createEmployee(data: EmployeeCreateData, db: EmployeeDbClient = prisma) {
    return await db.employee.create({
      data: {
        id: data.id,
        name: data.name,
        rut: data.rut,
        email: data.email,
        position: data.position,
        area: data.area,
        workdayType: data.workdayType,
        status: (data.status || "Activo") as EmployeeStatus,
        pin: data.pin,
      },
    });
  }

  async updateEmployee(id: string, data: EmployeeUpdateData) {
    return await prisma.employee.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        position: data.position,
        area: data.area,
        workdayType: data.workdayType,
        status: data.status as EmployeeStatus,
        pin: data.pin,
        isPinBlocked: data.isPinBlocked,
        pinFailedAttempts: data.pinFailedAttempts,
      },
    });
  }

  /**
   * Carga masiva de empleados con upsert por ID.
   */
  async createBulkEmployees(employees: BulkEmployeeInput[], actorUsername: string) {
    const CHUNK_SIZE = 50;
    let createdCount = 0;

    for (let i = 0; i < employees.length; i += CHUNK_SIZE) {
      const chunk = employees.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map((emp) =>
          prisma.employee.upsert({
            where: { id: emp.id },
            update: {
              name: emp.name,
              rut: emp.rut,
              email: emp.email,
              position: emp.position,
              area: emp.area,
              workdayType: emp.workdayType,
              status: (emp.status || "Activo") as EmployeeStatus,
              pin: emp.pin,
            },
            create: {
              id: emp.id,
              name: emp.name,
              rut: emp.rut,
              email: emp.email,
              position: emp.position,
              area: emp.area,
              workdayType: emp.workdayType,
              status: (emp.status || "Activo") as EmployeeStatus,
              pin: emp.pin,
            },
          }),
        ),
      );
      createdCount += chunk.length;
    }

    await auditService.log({
      actorUsername,
      action: "CARGA_MASIVA_EMPLEADOS",
      category: "OPERATIONS",
      severity: "INFO",
      details: { count: createdCount },
    });

    return createdCount;
  }
}

export const employeeService = new EmployeeService();
