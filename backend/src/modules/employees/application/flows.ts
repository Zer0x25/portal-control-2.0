import crypto from "node:crypto";
import { AppError, NotFoundError } from "../../../utils/AppError";
import type {
  EmployeeRow,
  EmployeeFlowDependencies,
  EmployeeCreateInput,
  EmployeeUpdateInput,
  EmployeeBulkInput,
  EmployeeQuery,
  EmployeePrincipal,
  EmployeeClockingOption,
  PublicEmployee,
} from "./contracts";
export function toPublicEmployee(row: EmployeeRow): PublicEmployee {
  return {
    id: row.id,
    name: row.name,
    rut: row.rut,
    email: row.email,
    position: row.position,
    area: row.area,
    workdayType: row.workdayType,
    status: row.status,
    isPinBlocked: row.isPinBlocked,
    pinFailedAttempts: row.pinFailedAttempts,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
export function createEmployeeFlows(deps: EmployeeFlowDependencies) {
  return {
    async list(query: EmployeeQuery, user?: EmployeePrincipal) {
      const kiosk = !user;
      const { rawEmployees, total } = await deps.repository.list(query, user, kiosk);
      if (kiosk)
        return rawEmployees.map((row) => ({
          id: row.id,
          name: row.name,
          rutHash: crypto
            .createHash("sha256")
            .update(row.rut.replace(/\./g, "").toUpperCase())
            .digest("hex"),
          isPinBlocked: row.isPinBlocked,
          status: row.status,
          area: row.area,
          workdayType: row.workdayType,
        }));
      const employees = rawEmployees.map((row) => ({
        ...toPublicEmployee(row),
        syncStatus: "synced",
        lastModified: row.updatedAt.getTime(),
        isDeleted: false,
      }));
      return query.page !== undefined && query.pageSize !== undefined
        ? {
            data: employees,
            pagination: {
              total,
              page: Number(query.page),
              totalPages: Math.ceil(total / Number(query.pageSize)),
            },
          }
        : employees;
    },
    async listClockingOptions(user?: EmployeePrincipal): Promise<EmployeeClockingOption[]> {
      return deps.repository.listClockingOptions(user);
    },
    async create(input: EmployeeCreateInput, actorUsername: string) {
      const { createUserAccount, ...data } = input;
      const employee = await deps.withoutTriggers(async () => {
        const created = await deps.transaction(async (tx) => {
          const id = await tx.resolveId(data.id);
          const row = await tx.create({ ...data, id });
          if (createUserAccount)
            await tx.ensureUser({ employeeId: row.id, fullName: row.name }, actorUsername);
          return row;
        });
        await deps.audit({
          actorUsername,
          action: "EMPLEADO_CREADO",
          category: "OPERATIONS",
          severity: "INFO",
          details: { employeeId: created.id, employeeName: created.name },
        });
        return created;
      });
      if (!employee) throw new AppError("EMPLOYEE_NOT_CREATED", 500, "EMPLOYEE_NOT_CREATED");
      const result = {
        ...toPublicEmployee(employee),
        syncStatus: "synced",
        lastModified: employee.updatedAt.getTime(),
        isDeleted: false,
      };
      deps.emit(result);
      return result;
    },
    async update(id: string, input: EmployeeUpdateInput, actorUsername: string) {
      const { createUserAccount, ...data } = input;
      const old = await deps.repository.find(id);
      if (!old) throw new NotFoundError("Empleado no encontrado");
      const { row: updated, forceLogout } = await deps.withoutTriggers(async () => {
        const txResult = await deps.transaction(async (tx) => {
          const row = await tx.update(id, data);
          if (createUserAccount && row.status !== "Archivado") {
            await tx.ensureUser({ employeeId: row.id, fullName: row.name }, actorUsername);
          }
          const logout = await tx.syncStatus(id, old.status, row.status, row.name, row.rut);
          return { row, forceLogout: logout };
        });
        if (old.status !== txResult.row.status)
          await deps.audit({
            actorUsername,
            action: `EMPLEADO_ESTADO_CAMBIADO: ${txResult.row.status}`,
            category: "OPERATIONS",
            severity: "WARNING",
            details: {
              employeeId: txResult.row.id,
              employeeName: txResult.row.name,
              oldStatus: old.status,
              newStatus: txResult.row.status,
            },
          });
        if (data.pin !== undefined && old.pin !== txResult.row.pin)
          await deps.audit({
            actorUsername,
            action: "EMPLEADO_PIN_ACTUALIZADO",
            category: "SEGURIDAD",
            severity: "CRITICAL",
            details: {
              employeeId: txResult.row.id,
              employeeName: txResult.row.name,
              isReset: data.pin === null || data.pin === undefined,
            },
          });
        await deps.audit({
          actorUsername,
          action: "EMPLEADO_ACTUALIZADO",
          category: "OPERATIONS",
          severity: "INFO",
          details: { employeeId: txResult.row.id, employeeName: txResult.row.name, changes: data },
        });
        return txResult;
      });
      if (forceLogout) {
        deps.emitForceLogout?.(forceLogout);
      }
      const result = {
        ...toPublicEmployee(updated),
        syncStatus: "synced",
        lastModified: updated.updatedAt.getTime(),
        isDeleted: false,
      };
      deps.emit(result);
      return result;
    },
    async bulk(input: EmployeeBulkInput[], actorUsername: string) {
      const count = await deps.withoutTriggers(() => deps.repository.bulk(input, actorUsername));
      deps.emit({ count });
      return { success: true, count };
    },
  };
}
export type EmployeeFlows = ReturnType<typeof createEmployeeFlows>;
