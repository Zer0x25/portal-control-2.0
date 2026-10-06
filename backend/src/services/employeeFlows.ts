import { createEmployeeFlows } from "../modules/employees";
import { employeeService } from "./EmployeeService";
import { userService } from "./UserService";
import { withDirectTransaction } from "./db";
import { requestContext } from "../utils/context";
import { auditService } from "./auditService";
import { SocketService } from "./socketService";

export const employeeFlows = createEmployeeFlows({
  repository: {
    list: (query, user, kiosk) =>
      employeeService.listEmployees(
        query,
        { ...user, employeeId: user?.employeeId ?? undefined },
        kiosk,
      ),
    resolveId: (id) => employeeService.resolveEmployeeId(id),
    find: (id) => employeeService.getEmployeeById(id),
    update: (id, data) => employeeService.updateEmployee(id, data),
    bulk: (data, actor) => employeeService.createBulkEmployees(data, actor),
  },
  transaction: (run) =>
    withDirectTransaction(
      (tx) =>
        run({
          create: (data) => employeeService.createEmployee(data, tx),
          ensureUser: async (input, actor) => {
            await userService.ensureEmployeeUser(input, actor, tx);
          },
        }),
      { timeout: 15000, maxWait: 5000 },
    ),
  withoutTriggers: (run) =>
    requestContext.run({ ...requestContext.getStore(), skipTrigger: true }, run),
  ensureUser: async (input, actor) => {
    await userService.ensureEmployeeUser(input, actor);
  },
  syncStatus: (id, oldStatus, newStatus, name, rut) =>
    employeeService.syncEmployeeStatus(id, oldStatus, newStatus, name, rut),
  audit: (entry) => auditService.log(entry),
  emit: (payload) => SocketService.emit("employee:updated", payload),
});
