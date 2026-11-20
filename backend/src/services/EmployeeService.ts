import prisma, { withDirectTransaction } from "./db";
import { Prisma, EmployeeStatus } from "../generated/prisma/client";
import bcryptjs from "bcryptjs";
import { auditService } from "./auditService";
import { addBusinessDaysChile, toBusinessDateChile } from "../utils/timeUtils";
import type { AuthUser } from "../modules/auth";
import { SocketService } from "./socketService";
import { DEFAULT_TEMPORARY_PASSWORD } from "./UserService";
import { NotFoundError, ValidationError } from "../utils/AppError";

const EMPLOYEE_ID_PREFIX = "EMP-";
const EMPLOYEE_ID_BASE = 1000;
type EmployeeDbClient =
  Pick<Prisma.TransactionClient, "employee"> | Pick<typeof prisma, "employee">;

/** Normalizes a Chilean RUT to its digits and derives the 4-digit initial PIN. */
export function deriveInitialPinFromRut(rut: string): string {
  const digits = rut.replace(/\D/g, "");
  if (digits.length < 4) {
    throw new ValidationError(
      "El RUT debe contener al menos 4 dígitos numéricos para generar el PIN inicial",
    );
  }
  return digits.slice(0, 4);
}

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
   * Resuelve o genera un nuevo ID de empleado correlativo de forma atómica.
   */
  async resolveEmployeeId(
    inputId?: string,
    db: Prisma.TransactionClient | typeof prisma = prisma,
  ): Promise<string> {
    if (inputId && inputId.trim().length > 0) return inputId.trim().toUpperCase();

    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('employees:resolve_id'))`;
    const rows = await db.$queryRaw<Array<{ max_num: number | null }>>`
      SELECT MAX(CAST(SUBSTRING(id FROM '^EMP-([0-9]+)$') AS INTEGER)) AS max_num
      FROM employees
      WHERE id ~ '^EMP-[0-9]+$'
    `;
    const current = rows[0]?.max_num ?? EMPLOYEE_ID_BASE;
    return `${EMPLOYEE_ID_PREFIX}${Math.max(current, EMPLOYEE_ID_BASE) + 1}`;
  }

  private async applyEmployeeStatusSync(
    tx: Prisma.TransactionClient,
    id: string,
    oldStatus: EmployeeStatus,
    newStatus: EmployeeStatus,
    updatedName: string,
    updatedRut: string,
  ): Promise<{ forceLogoutUserId?: string; forceLogoutEmployeeId?: string }> {
    if (oldStatus === newStatus) return {};

    if (newStatus === "Archivado") {
      const today = toBusinessDateChile();
      const yesterday = addBusinessDaysChile(today, -1);

      // 1. Terminate Ongoing assignments
      const activeAssignments = await tx.assignedShift.findMany({
        where: {
          employeeId: id,
          isDeleted: false,
          startDate: { lte: today },
          OR: [{ endDate: null }, { endDate: { gte: today } }],
        },
      });

      if (activeAssignments.length > 0) {
        const patterns = await tx.shiftPattern.findMany({
          where: { id: { in: activeAssignments.map((a) => a.shiftPatternId) } },
        });

        await Promise.all(
          activeAssignments.map((as) => {
            const pattern = patterns.find((p) => p.id === as.shiftPatternId);
            return tx.assignedShift.update({
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
      await tx.assignedShift.updateMany({
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
      await tx.leaveRecord.deleteMany({
        where: {
          employeeId: id,
          startDate: { gt: today },
        },
      });

      const activeLeaves = await tx.leaveRecord.findMany({
        where: {
          employeeId: id,
          startDate: { lte: today },
          endDate: { gt: today },
        },
      });

      if (activeLeaves.length > 0) {
        await Promise.all(
          activeLeaves.map((leave) =>
            tx.leaveRecord.update({
              where: { id: leave.id },
              data: { endDate: today },
            }),
          ),
        );
      }

      // 4. User Sync
      const user = await tx.user.findFirst({ where: { employeeId: id } });
      if (user) {
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${user.id} FOR UPDATE`;
        await tx.user.update({
          where: { id: user.id },
          data: { role: "Archivado" },
        });
        await tx.activeSession.deleteMany({ where: { userId: user.id } });
        return { forceLogoutUserId: user.id, forceLogoutEmployeeId: id };
      }
      return { forceLogoutEmployeeId: id };
    } else if (newStatus === "Activo" && oldStatus === "Archivado") {
      // Un-archive User and reset credentials
      const defaultPinHash = await bcryptjs.hash(deriveInitialPinFromRut(updatedRut), 10);
      const user = await tx.user.findFirst({ where: { employeeId: id } });
      if (user) {
        const defaultPassword = bcryptjs.hashSync(DEFAULT_TEMPORARY_PASSWORD, 10);

        await tx.user.update({
          where: { id: user.id },
          data: {
            role: "Usuario",
            passwordHash: defaultPassword,
            isForcePasswordChange: true,
          },
        });
      }

      await tx.employee.update({
        where: { id },
        data: {
          pin: defaultPinHash,
          pinFailedAttempts: 0,
          isPinBlocked: false,
        },
      });
    }

    return {};
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
    tx?: Prisma.TransactionClient,
  ): Promise<{ forceLogoutUserId?: string; forceLogoutEmployeeId?: string }> {
    if (oldStatus === newStatus) return {};

    if (tx) {
      return this.applyEmployeeStatusSync(tx, id, oldStatus, newStatus, updatedName, updatedRut);
    }

    const targets = await withDirectTransaction((directTx) =>
      this.applyEmployeeStatusSync(directTx, id, oldStatus, newStatus, updatedName, updatedRut),
    );
    if (targets.forceLogoutUserId) {
      SocketService.emitForceLogoutToUser(targets.forceLogoutUserId, {
        reason: "SESSION_INVALIDATED",
      });
    }
    if (targets.forceLogoutEmployeeId) {
      SocketService.emitForceLogoutToEmployee(targets.forceLogoutEmployeeId, {
        reason: "SESSION_INVALIDATED",
      });
    }
    return targets;
  }

  /**
   * Obtiene y pagina empleados con filtros.
   */
  async listEmployees(
    query: EmployeeListQueryInput,
    authUser?: EmployeeListAuthUser,
    isPublicKiosk?: boolean,
  ) {
    if (authUser?.role === "Archivado") {
      return { rawEmployees: [], total: 0 };
    }
    if (authUser?.role === "Usuario" && !authUser.employeeId) {
      return { rawEmployees: [], total: 0 };
    }
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

    let supervisorArea: string | undefined;
    if (authUser?.role === "Supervisor") {
      if (!authUser.employeeId) {
        return { rawEmployees: [], total: 0 };
      }
      const supervisor = await prisma.employee.findUnique({
        where: { id: authUser.employeeId },
        select: { area: true },
      });
      if (!supervisor?.area) {
        return { rawEmployees: [], total: 0 };
      }
      supervisorArea = supervisor.area;
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

    if (supervisorArea !== undefined) {
      if (area && area !== "Todas" && area !== supervisorArea) {
        return { rawEmployees: [], total: 0 };
      }
      where.area = supervisorArea;
    } else if (area && area !== "Todas") {
      where.area = area as string;
    }

    if (isPublicKiosk) {
      where.status = "Activo";
    }

    const isPaginated = page !== undefined && pageSize !== undefined;
    const take = isPaginated ? Number(pageSize) : undefined;
    const skip = isPaginated ? (Number(page) - 1) * Number(pageSize) : undefined;
    const employeeQuery = {
      where,
      orderBy: { name: "asc" as const },
      take,
      skip,
    };

    if (!isPaginated) {
      const rawEmployees = await prisma.employee.findMany(employeeQuery);
      return { rawEmployees, total: rawEmployees.length };
    }

    const [rawEmployees, total] = await Promise.all([
      prisma.employee.findMany(employeeQuery),
      prisma.employee.count({ where }),
    ]);

    return { rawEmployees, total };
  }

  async listClockingOptions(authUser?: EmployeeListAuthUser) {
    if (authUser?.role === "Archivado") return [];
    if (authUser?.role === "Usuario" && !authUser.employeeId) return [];
    if (authUser?.role === "Supervisor" && authUser.employeeId) {
      const supervisor = await prisma.employee.findUnique({
        where: { id: authUser.employeeId },
        select: { area: true },
      });
      if (!supervisor) return [];
      const employees = await prisma.employee.findMany({
        where: { status: "Activo", area: supervisor.area },
        orderBy: { name: "asc" },
        select: { id: true, name: true, position: true, area: true, workdayType: true },
      });
      return employees.map((employee) => ({ ...employee, status: "Activo" as const }));
    }

    const where: Prisma.EmployeeWhereInput = { status: "Activo" };
    if (authUser?.role === "Usuario" && authUser.employeeId) {
      where.id = authUser.employeeId;
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { name: "asc" },
      select: { id: true, name: true, position: true, area: true, workdayType: true },
    });

    return employees.map((employee) => ({ ...employee, status: "Activo" as const }));
  }

  async getEmployeeById(id: string) {
    return await prisma.employee.findUnique({ where: { id } });
  }

  private async normalizePinForStorage(pin?: string | null): Promise<string | null | undefined> {
    if (typeof pin === "string" && /^\d{4}$/.test(pin)) {
      return bcryptjs.hash(pin, 10);
    }
    return pin;
  }

  async createEmployee(data: EmployeeCreateData, db: EmployeeDbClient = prisma) {
    const rawPin =
      data.pin === undefined || data.pin === "" ? deriveInitialPinFromRut(data.rut) : data.pin;
    const hashedPin = await this.normalizePinForStorage(rawPin);
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
        pin: hashedPin,
      },
    });
  }

  private async updateEmployeeInTx(
    tx: Prisma.TransactionClient,
    id: string,
    data: EmployeeUpdateData,
  ) {
    await tx.$queryRaw`SELECT id FROM employees WHERE id = ${id} FOR UPDATE`;
    const existing = await tx.employee.findUnique({
      where: { id },
      select: { id: true, rut: true },
    });
    if (!existing) {
      throw new NotFoundError("Empleado no encontrado");
    }
    if (typeof data.pin === "string" && data.pin === deriveInitialPinFromRut(existing.rut)) {
      throw new ValidationError("El PIN no puede ser igual a los primeros 4 dígitos del RUT");
    }
    const hashedPin = await this.normalizePinForStorage(data.pin);
    const resetPinState = data.pin !== undefined;
    return await tx.employee.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        position: data.position,
        area: data.area,
        workdayType: data.workdayType,
        status: data.status as EmployeeStatus,
        pin: hashedPin,
        isPinBlocked: resetPinState ? false : data.isPinBlocked,
        pinFailedAttempts: resetPinState ? 0 : data.pinFailedAttempts,
      },
    });
  }

  async updateEmployee(id: string, data: EmployeeUpdateData, tx?: Prisma.TransactionClient) {
    if (tx) {
      return this.updateEmployeeInTx(tx, id, data);
    }
    return withDirectTransaction((directTx) => this.updateEmployeeInTx(directTx, id, data));
  }

  /**
   * Carga masiva de empleados con upsert por ID dentro de transacción directa.
   */
  async createBulkEmployees(employees: BulkEmployeeInput[], actorUsername: string) {
    const CHUNK_SIZE = 50;
    const createdCount = await withDirectTransaction(
      async (tx) => {
        let count = 0;
        for (let i = 0; i < employees.length; i += CHUNK_SIZE) {
          const chunk = employees.slice(i, i + CHUNK_SIZE);
          await Promise.all(
            chunk.map(async (emp) => {
              const rawPin =
                emp.pin === undefined || emp.pin === ""
                  ? deriveInitialPinFromRut(emp.rut)
                  : emp.pin;
              const hashedPin = await this.normalizePinForStorage(rawPin);
              return tx.employee.upsert({
                where: { id: emp.id },
                update: {
                  name: emp.name,
                  rut: emp.rut,
                  email: emp.email,
                  position: emp.position,
                  area: emp.area,
                  workdayType: emp.workdayType,
                  status: (emp.status || "Activo") as EmployeeStatus,
                  pin: hashedPin,
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
                  pin: hashedPin,
                },
              });
            }),
          );
          count += chunk.length;
        }
        return count;
      },
      { timeout: 30000, maxWait: 5000 },
    );

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
