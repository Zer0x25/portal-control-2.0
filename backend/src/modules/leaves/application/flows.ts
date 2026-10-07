import { toCaughtError } from "../../../utils/caughtError";
import { NotFoundError, ValidationError } from "../../../utils/AppError";
import type { LeaveFlowDependencies, LeaveInput, LeavePrincipal, LeaveQuery } from "./contracts";
const message = (error: unknown) => toCaughtError(error).message;
const createErrors: Record<string, string> = {
  LIMIT_7_DAYS_EXCEEDED: "No se pueden registrar ausencias con más de 7 días de antigüedad.",
  CANNOT_EDIT_FINALIZED: "No se pueden editar ausencias que ya han finalizado.",
  IMMUTABLE_FIELDS_CHANGED: "El empleado, tipo y fecha de inicio no pueden ser modificados.",
  INVALID_END_DATE_PAST: "La fecha de término no puede ser anterior al día de hoy.",
};
export function createLeaveFlows<Row, Item>(deps: LeaveFlowDependencies<Row, Item>) {
  return {
    async list(query: LeaveQuery, user?: LeavePrincipal) {
      const result = await deps.service.list(
        {
          page: Number(query.page) || 1,
          pageSize: Number(query.pageSize) || 50,
          since: query.since,
          startDate: query.startDate,
          endDate: query.endDate,
          employeeId: query.employeeId,
          showArchived: query.showArchived === "true",
        },
        { role: user?.role || "Usuario", employeeId: user?.employeeId ?? undefined },
      );
      return {
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages,
        },
      };
    },
    async upsert(input: LeaveInput) {
      try {
        return { success: true, data: await deps.service.upsert(input) };
      } catch (error) {
        const mapped = createErrors[message(error)];
        if (mapped) throw new ValidationError(mapped);
        throw error;
      }
    },
    async delete(id: string) {
      if (!id) throw new ValidationError("ID inválido");
      try {
        await deps.service.delete(id);
        return { success: true, message: "Ausencia finalizada" };
      } catch (error) {
        const key = message(error);
        if (key === "LIMIT_7_DAYS_EXCEEDED")
          throw new ValidationError(
            "No se pueden eliminar ausencias con más de 7 días de antigüedad.",
          );
        if (key === "ARCHIVE_PROTECTION_VIOLATED")
          throw new ValidationError(
            "No se pueden eliminar ausencias archivadas a menos que hayan sido creadas en las últimas 24 horas.",
          );
        if (key === "NOT_FOUND") throw new NotFoundError("Ausencia no encontrada");
        throw error;
      }
    },
  };
}
export type LeaveFlows = ReturnType<typeof createLeaveFlows>;
