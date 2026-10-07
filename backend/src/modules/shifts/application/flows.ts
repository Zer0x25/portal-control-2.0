import { ForbiddenError, NotFoundError, ValidationError } from "../../../utils/AppError";
import type {
  ShiftFlowDependencies,
  ShiftQuery,
  ShiftPrincipal,
  PatternInput,
  AssignmentInput,
  MatrixInput,
  ConflictInput,
  MonthlyPlanInput,
} from "./contracts";
const message = (error: unknown) => (error instanceof Error ? error.message : String(error));
const code = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
const selfOnly = (user?: ShiftPrincipal) =>
  user?.role === "Usuario" || user?.role === "Kiosk_Employee";
const isShiftValidationError = (value: string) =>
  value.includes("Conflicto") || value.includes("excesiva") || value.includes("Descanso");
export function createShiftFlows<
  Pattern,
  Patterns,
  Assignment,
  Assignments,
  Schedule,
  Month,
  Matrix,
  Conflict,
  Scheduled,
>(
  deps: ShiftFlowDependencies<
    Pattern,
    Patterns,
    Assignment,
    Assignments,
    Schedule,
    Month,
    Matrix,
    Conflict,
    Scheduled
  >,
) {
  return {
    async patterns(query: ShiftQuery) {
      return deps.service.patterns({
        since: query.since,
        showArchived: query.showArchived === "true",
        page: query.page ? parseInt(query.page, 10) : undefined,
        pageSize: query.pageSize ? parseInt(query.pageSize, 10) : undefined,
        search: query.search,
      });
    },
    async createPattern(input: PatternInput) {
      try {
        return await deps.service.createPattern(input);
      } catch (error) {
        if (message(error).includes("horario")) throw new ValidationError(message(error));
        throw error;
      }
    },
    async updatePattern(id: string, input: Partial<PatternInput>) {
      try {
        return await deps.service.updatePattern(id, input);
      } catch (error) {
        if (message(error).includes("horario")) throw new ValidationError(message(error));
        throw error;
      }
    },
    async deletePattern(id: string) {
      try {
        await deps.service.deletePattern(id);
      } catch (error) {
        if (code(error) !== "P2025") throw error;
      }
    },
    async bulkPatterns(input: PatternInput[]) {
      return { count: await deps.service.bulkPatterns(input) };
    },
    async assignments(query: ShiftQuery, user?: ShiftPrincipal) {
      if (selfOnly(user) && !user?.employeeId) throw new ForbiddenError("Acceso denegado");
      return deps.service.assignments({
        page: query.page ? parseInt(query.page) : undefined,
        pageSize: query.pageSize ? parseInt(query.pageSize) : undefined,
        since: query.since,
        startDate: query.startDate,
        endDate: query.endDate,
        employeeId: selfOnly(user) ? user?.employeeId : query.employeeId,
        role: user?.role,
        showArchived: query.showArchived === "true",
      });
    },
    async assign(input: AssignmentInput, actor: string) {
      try {
        return await deps.service.assign(input, actor);
      } catch (error) {
        if (isShiftValidationError(message(error))) throw new ValidationError(message(error));
        throw error;
      }
    },
    async updateAssignment(id: string, input: Partial<AssignmentInput>, actor: string) {
      try {
        return await deps.service.updateAssignment(id, input, actor);
      } catch (error) {
        if (isShiftValidationError(message(error))) throw new ValidationError(message(error));
        throw error;
      }
    },
    async deleteAssignment(id: string, actor: string) {
      try {
        await deps.service.deleteAssignment(id, actor);
      } catch (error) {
        if (message(error).includes("encontrada")) throw new NotFoundError(message(error));
        throw error;
      }
    },
    async bulkAssignments(input: AssignmentInput[]) {
      try {
        return { count: await deps.service.bulkAssignments(input) };
      } catch (error) {
        if (message(error).includes("masiva")) throw new ValidationError(message(error));
        throw error;
      }
    },
    async daily(id: string, query: ShiftQuery, user?: ShiftPrincipal) {
      if (!id || !query.date) throw new ValidationError("ID y fecha requeridos");
      const date = deps.parseDate(query.date);
      if (selfOnly(user) && id !== user?.employeeId) throw new ForbiddenError("Acceso denegado");
      const result = await deps.service.daily(id, date);
      if (!result) throw new NotFoundError("Empleado no encontrado");
      return result;
    },
    async scheduled(query: ShiftQuery) {
      if (!query.date) throw new ValidationError("Fecha requerida");
      return deps.service.scheduled(deps.parseDate(query.date));
    },
    async month(id: string, query: ShiftQuery, user?: ShiftPrincipal) {
      const year = parseInt(query.year ?? ""),
        month = parseInt(query.month ?? "");
      if (!id || isNaN(year) || isNaN(month)) throw new ValidationError("Parámetros inválidos");
      if (selfOnly(user) && id !== user?.employeeId) throw new ForbiddenError("Acceso denegado");
      return deps.service.month(id, year, month);
    },
    async matrix(input: MatrixInput, user?: ShiftPrincipal) {
      let ids = input.employeeIds;
      if (selfOnly(user)) {
        if (!user?.employeeId) throw new ForbiddenError("Acceso denegado");
        ids = [user.employeeId];
      }
      return deps.service.matrix(input.startDate, input.endDate, ids);
    },
    async conflicts(input: ConflictInput) {
      const conflicts = await deps.service.conflicts(
        input.employeeId,
        input.startDate,
        input.endDate,
        input.excludeAssignmentId,
      );
      return {
        hasConflicts: conflicts.length > 0,
        conflicts,
        message:
          conflicts.length > 0
            ? `Se detectaron ${conflicts.length} conflicto(s).`
            : "No hay conflictos.",
      };
    },
    async monthlyPlan(id: string, year: string, month: string) {
      const yearNum = parseInt(year),
        monthNum = parseInt(month);
      if (isNaN(yearNum) || isNaN(monthNum)) throw new ValidationError("Invalid year or month");
      return deps.service.monthlyPlan(id, yearNum, monthNum);
    },
    async saveMonthlyPlan(input: MonthlyPlanInput) {
      const { employeeId, month, year, dailySchedules, patternName } = input;
      if (!employeeId || !month || !year || !dailySchedules)
        throw new ValidationError("Missing required fields");
      await deps.service.saveMonthlyPlan({
        employeeId,
        month: parseInt(month),
        year: parseInt(year),
        dailySchedules,
        patternName,
      });
      return { success: true, message: "Monthly plan updated successfully" };
    },
    async suggest(query: ShiftQuery) {
      if (!query.employeeId || !query.year || !query.month)
        throw new ValidationError("Missing parameters");
      return {
        suggestedName: await deps.service.suggest(query.employeeId, query.year, query.month),
      };
    },
  };
}
export type ShiftFlows = ReturnType<typeof createShiftFlows>;
