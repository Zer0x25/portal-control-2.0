import { AppError, NotFoundError } from "../../../utils/AppError";
import type {
  EmployeeRow,
  EmployeeFlowDependencies,
  EmployeeCreateInput,
  EmployeeUpdateInput,
  EmployeeBulkInput,
  EmployeeQuery,
  EmployeePrincipal,
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
          rut: row.rut,
          isPinBlocked: row.isPinBlocked,
          status: row.status,
          area: row.area,
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
    async create(input: EmployeeCreateInput, actorUsername: string) {
      const { createUserAccount, ...data } = input;
      const id = await deps.repository.resolveId(data.id);
      const employee = await deps.withoutTriggers(async () => {
        const created = await deps.transaction(async (tx) => {
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
      const result = toPublicEmployee(employee);
      deps.emit(result);
      return result;
    },
    async update(id: string, input: EmployeeUpdateInput, actorUsername: string) {
      const { createUserAccount, ...data } = input;
      const old = await deps.repository.find(id);
      if (!old) throw new NotFoundError("Empleado no encontrado");
      const updated = await deps.withoutTriggers(async () => {
        const row = await deps.repository.update(id, data);
        if (old.status !== row.status)
          await deps.audit({
            actorUsername,
            action: `EMPLEADO_ESTADO_CAMBIADO: ${row.status}`,
            category: "OPERATIONS",
            severity: "WARNING",
            details: {
              employeeId: row.id,
              employeeName: row.name,
              oldStatus: old.status,
              newStatus: row.status,
            },
          });
        if (data.pin !== undefined && old.pin !== row.pin)
          await deps.audit({
            actorUsername,
            action: "EMPLEADO_PIN_ACTUALIZADO",
            category: "SEGURIDAD",
            severity: "CRITICAL",
            details: {
              employeeId: row.id,
              employeeName: row.name,
              isReset: data.pin === null || data.pin === undefined,
            },
          });
        await deps.audit({
          actorUsername,
          action: "EMPLEADO_ACTUALIZADO",
          category: "OPERATIONS",
          severity: "INFO",
          details: { employeeId: row.id, employeeName: row.name, changes: data },
        });
        return row;
      });
      if (createUserAccount && updated.status !== "Archivado")
        await deps.ensureUser({ employeeId: updated.id, fullName: updated.name }, actorUsername);
      await deps.syncStatus(id, old.status, updated.status, updated.name, updated.rut);
      const result = toPublicEmployee(updated);
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
