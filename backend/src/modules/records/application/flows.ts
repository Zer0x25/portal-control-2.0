import {
  AppError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../../utils/AppError";
import type {
  AnomalyResolution,
  RecordFlowDependencies,
  RecordPrincipal,
  PunchInput,
  RecordInput,
  RecordQuery,
  IntegrityResult,
  ExportFilters,
  IntegrityFilters,
} from "./contracts";
const message = (error: unknown) => (error instanceof Error ? error.message : String(error));
const string = (value: unknown) => (typeof value === "string" ? value : undefined);
const punchErrors: Record<string, string> = {
  ALREADY_PUNCHED_IN: "Ya existe una entrada activa para este empleado hoy.",
  ALREADY_PUNCHED_OUT: "La jornada ya fue cerrada para este empleado.",
  WORKDAY_FINISHED: "La jornada ya fue cerrada para este empleado.",
  ALREADY_BREAK_STARTED: "Ya existe una colación iniciada.",
  NO_BREAK_STARTED: "No hay colación iniciada para finalizar.",
  ALREADY_BREAK_FINISHED: "La colación ya fue finalizada.",
  ACTION_ALREADY_TAKEN: "Esta accion ya fue registrada en la jornada actual.",
  BREAK_INCOMPLETE_TOO_EARLY:
    "No se puede marcar salida aun: la colacion incompleta debe superar 60 minutos.",
};
export function createRecordFlows<
  Row,
  View,
  List,
  Punch extends object,
  Verify extends IntegrityResult,
  Export,
>(deps: RecordFlowDependencies<Row, View, List, Punch, Verify, Export>) {
  return {
    async punch(input: PunchInput, user?: RecordPrincipal) {
      if (!user) throw new AuthError("No autorizado");
      let employeeId = input.employeeId;
      if (user.role === "Usuario") {
        const found = await deps.service.linkedEmployee(user.id);
        if (!found?.employeeId) throw new ForbiddenError("Usuario no tiene empleado asociado");
        employeeId = found.employeeId;
      } else if (!employeeId) throw new ValidationError("Employee ID is required");
      const now = deps.now();
      if (await deps.service.isLocked(deps.businessDate(now)))
        throw new ForbiddenError("El periodo contable para esta fecha está cerrado.");
      const last = await deps.service.lastPunch(employeeId);
      if (last && input.forcedType && last.updatedAt.getTime() >= now.getTime() - 15000)
        throw new AppError(
          "Acción bloqueada por seguridad. Espere unos segundos.",
          429,
          "TOO_MANY_REQUESTS",
        );
      try {
        return {
          success: true,
          ...(await deps.service.punch(
            user,
            employeeId,
            input.source,
            input.forcedType,
            input.latitude,
            input.longitude,
          )),
        };
      } catch (error) {
        const key = message(error);
        if (key === "EMPLOYEE_NOT_FOUND") throw new NotFoundError("Empleado no encontrado");
        if (punchErrors[key]) throw new ValidationError(punchErrors[key]);
        throw new AppError("Error al registrar marcaje", 500, "PUNCH_ERROR");
      }
    },
    async list(query: RecordQuery, user?: RecordPrincipal) {
      try {
        return await deps.service.list(query, user);
      } catch (error) {
        if (message(error) === "UNAUTHORIZED_NO_EMPLOYEE")
          throw new ForbiddenError("Usuario no tiene empleado asociado");
        throw error;
      }
    },
    async save(input: RecordInput, actor: string) {
      if (input.date && (await deps.service.isLocked(input.date)))
        throw new ForbiddenError("Periodo contable cerrado.");
      const row = await deps.withoutTriggers(() => deps.service.save(input, actor));
      const result = await deps.service.enrich(row);
      deps.emit("timeRecord:updated", result);
      return result;
    },
    async bulk(input: RecordInput[], actor: string) {
      if (!Array.isArray(input)) throw new ValidationError("Se esperaba un array");
      const dates = [
        ...new Set(
          input
            .map((row) => row.date)
            .filter((date) => typeof date === "string" && Boolean(date.trim())),
        ),
      ];
      const locked = await Promise.all(dates.map((date) => deps.service.isLocked(date)));
      if (locked.some(Boolean)) throw new ForbiddenError("El lote contiene periodos cerrados.");
      const count = await deps.withoutTriggers(() => deps.service.bulk(input, actor));
      deps.emit("timeRecord:batch_created", { count });
      return { success: true, count };
    },
    async prepareExport(query: Record<string, unknown>, user?: RecordPrincipal) {
      const startDate = string(query.startDate),
        endDate = string(query.endDate);
      if (!startDate || !endDate) throw new ValidationError("Rango de fechas requerido");
      // Original controller casts employeeId, while other export filters use queryString.
      let employeeId = query.employeeId as string | undefined;
      if (user?.role === "Usuario" || user?.role === "Kiosk_Employee") {
        if (!user.employeeId) throw new ForbiddenError("No asociado a empleado");
        employeeId = user.employeeId;
      }
      const format = query.format === undefined ? "json" : query.format;
      // Audit belongs to this export promise, including its error/close path.
      await deps.audit({
        actorUsername: user?.username || "SYSTEM",
        action: "DATA_EXPORT",
        category: "OPERATIONS",
        severity: "INFO",
        details: { format, dateRange: `${startDate} to ${endDate}` },
      });
      return {
        format,
        filters: {
          startDate,
          endDate,
          employeeId,
          area: string(query.area),
          cargo: string(query.cargo),
        },
      };
    },
    exportJson(filters: ExportFilters) {
      return deps.service.export(filters);
    },
    async delete(id: string, actor: string) {
      try {
        await deps.withoutTriggers(() => deps.service.delete(id, actor));
        deps.emit("timeRecord:deleted", { id });
      } catch (error) {
        if (message(error) === "RECORD_LOCKED")
          throw new ForbiddenError("Periodo contable cerrado.");
        if (message(error) === "RECORD_NOT_FOUND")
          throw new NotFoundError("Registro no encontrado");
        throw error;
      }
    },
    async autoClose() {
      return { success: true, closedCount: await deps.service.autoClose() };
    },
    async verify(filters: IntegrityFilters) {
      const result = await deps.service.verify(filters);
      return {
        success: true,
        summary: {
          checkedCount: result.checkedCount,
          brokenCount: result.brokenCount,
          scope: {
            employeeId: filters.employeeId ?? null,
            from: filters.from ?? null,
            to: filters.to ?? null,
          },
        },
        broken: result.broken,
      };
    },
    async resolve(id: string, resolution: AnomalyResolution, actor: string) {
      const row = await deps.service.resolve(id, resolution, actor);
      deps.emit("timeRecord:updated", row);
      return row;
    },
  };
}
export type RecordFlows = ReturnType<typeof createRecordFlows>;
