import crypto from "node:crypto";
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
    listClockingOptions: (user) =>
      employeeService.listClockingOptions({
        ...user,
        employeeId: user?.employeeId ?? undefined,
      }),
    resolveId: (id) => employeeService.resolveEmployeeId(id),
    find: (id) => employeeService.getEmployeeById(id),
    update: (id, data) => employeeService.updateEmployee(id, data),
    bulk: (data, actor) => employeeService.createBulkEmployees(data, actor),
  },
  transaction: (run) =>
    withDirectTransaction(
      (tx) =>
        run({
          resolveId: (id) => employeeService.resolveEmployeeId(id, tx),
          create: (data) => employeeService.createEmployee(data, tx),
          update: (id, data) => employeeService.updateEmployee(id, data, tx),
          ensureUser: async (input, actor) => {
            await userService.ensureEmployeeUser(input, actor, tx);
          },
          syncStatus: (id, oldStatus, newStatus, name, rut) =>
            employeeService.syncEmployeeStatus(id, oldStatus, newStatus, name, rut, tx),
        }),
      { timeout: 15000, maxWait: 5000 },
    ),
  withoutTriggers: (run) =>
    requestContext.run({ ...requestContext.getStore(), skipTrigger: true }, run),
  ensureUser: async (input, actor) => {
    await userService.ensureEmployeeUser(input, actor);
  },
  syncStatus: async (id, oldStatus, newStatus, name, rut) => {
    await employeeService.syncEmployeeStatus(id, oldStatus, newStatus, name, rut);
  },
  audit: (entry) => auditService.log(entry),
  emit: (payload) => SocketService.emit("employee:updated", payload),
  emitForceLogout: ({ forceLogoutUserId, forceLogoutEmployeeId }) => {
    if (forceLogoutUserId) {
      SocketService.emitForceLogoutToUser(forceLogoutUserId, { reason: "SESSION_INVALIDATED" });
    }
    if (forceLogoutEmployeeId) {
      SocketService.emitForceLogoutToEmployee(forceLogoutEmployeeId, {
        reason: "SESSION_INVALIDATED",
      });
    }
  },
  hashRut: (rut) =>
    crypto.createHash("sha256").update(rut.replace(/\./g, "").toUpperCase()).digest("hex"),
});
