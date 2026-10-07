import type {} from "../../../platform/fastify/types";
import type { FastifyPluginAsync, onRequestHookHandler } from "fastify";
import { z } from "zod";
import {
  ShiftPatternSchema,
  BulkShiftPatternSchema,
  AssignedShiftSchema,
  BulkAssignedShiftSchema,
  CalendarMatrixRequestSchema,
  MonthlyPlanRequestSchema,
  ConflictValidationSchema,
  ShiftQuerySchema,
} from "../../../models/schemas/shift.schemas";
import { validateRequest } from "../../../platform/fastify/validation";
import { ForbiddenError } from "../../../utils/AppError";
import type { ShiftFlows } from "../application/flows";
import type {
  ShiftQuery,
  PatternInput,
  AssignmentInput,
  MatrixInput,
  MonthlyPlanInput,
  ConflictInput,
} from "../application/contracts";
export const shiftsPlugin: FastifyPluginAsync<{
  service: ShiftFlows;
  authenticate: onRequestHookHandler;
}> = async (app, options) => {
  const supervisor: onRequestHookHandler = async (req) => {
    if (
      !req.user?.role ||
      !["Administrador", "Supervisor_Elevado", "Supervisor", "Reloj_Control"].includes(
        req.user.role,
      )
    )
      throw new ForbiddenError("Acceso denegado: Se requieren permisos de Supervisor o superior");
  };
  const read = { config: { requiresAuth: true }, onRequest: options.authenticate },
    write = { config: { requiresAuth: true }, onRequest: [options.authenticate, supervisor] };
  const params = z.object({ id: z.string() });
  // Query validators on legacy schedule routes are markers; application keeps manual checks.
  const manual = validateRequest("query", z.unknown());
  const actor = (user?: { username: string }) => user?.username || "System";
  app.get<{ Querystring: ShiftQuery }>(
    "/api/shifts/patterns",
    { ...read, preHandler: validateRequest("query", ShiftQuerySchema) },
    (req) => options.service.patterns(req.query),
  );
  app.post<{ Body: PatternInput }>(
    "/api/shifts/patterns",
    { ...write, preHandler: validateRequest("body", ShiftPatternSchema) },
    async (req, reply) => reply.code(201).send(await options.service.createPattern(req.body)),
  );
  app.put<{ Params: { id: string }; Body: Partial<PatternInput> }>(
    "/api/shifts/patterns/:id",
    {
      ...write,
      preHandler: [
        validateRequest("params", params),
        validateRequest("body", ShiftPatternSchema.partial()),
      ],
    },
    (req) => options.service.updatePattern(req.params.id, req.body),
  );
  app.delete<{ Params: { id: string } }>(
    "/api/shifts/patterns/:id",
    { ...write, preHandler: validateRequest("params", params) },
    async (req, reply) => {
      await options.service.deletePattern(req.params.id);
      return reply.code(204).send();
    },
  );
  app.post<{ Body: PatternInput[] }>(
    "/api/shifts/patterns/bulk",
    {
      ...write,
      bodyLimit: 10 * 1024 * 1024,
      preHandler: validateRequest("body", BulkShiftPatternSchema),
    },
    async (req, reply) => reply.code(201).send(await options.service.bulkPatterns(req.body)),
  );
  app.get<{ Querystring: ShiftQuery }>(
    "/api/shifts/assignments",
    { ...read, preHandler: validateRequest("query", ShiftQuerySchema) },
    (req) => options.service.assignments(req.query, req.user),
  );
  app.post<{ Body: AssignmentInput }>(
    "/api/shifts/assignments",
    { ...write, preHandler: validateRequest("body", AssignedShiftSchema) },
    async (req, reply) =>
      reply.code(201).send(await options.service.assign(req.body, actor(req.user))),
  );
  app.put<{ Params: { id: string }; Body: Partial<AssignmentInput> }>(
    "/api/shifts/assignments/:id",
    {
      ...write,
      preHandler: [
        validateRequest("params", params),
        validateRequest("body", AssignedShiftSchema.partial()),
      ],
    },
    (req) => options.service.updateAssignment(req.params.id, req.body, actor(req.user)),
  );
  app.delete<{ Params: { id: string } }>(
    "/api/shifts/assignments/:id",
    { ...write, preHandler: validateRequest("params", params) },
    async (req, reply) => {
      await options.service.deleteAssignment(req.params.id, actor(req.user));
      return reply.code(204).send();
    },
  );
  app.post<{ Body: AssignmentInput[] }>(
    "/api/shifts/assignments/bulk",
    {
      ...write,
      bodyLimit: 10 * 1024 * 1024,
      preHandler: validateRequest("body", BulkAssignedShiftSchema),
    },
    async (req, reply) => reply.code(201).send(await options.service.bulkAssignments(req.body)),
  );
  app.get<{ Params: { id: string }; Querystring: ShiftQuery }>(
    "/api/shifts/schedule/employee/:id",
    { ...read, preHandler: manual },
    (req) => options.service.daily(req.params.id, req.query, req.user),
  );
  app.get<{ Querystring: ShiftQuery }>(
    "/api/shifts/schedule/employees-on-date",
    { ...write, preHandler: manual },
    (req) => options.service.scheduled(req.query),
  );
  app.get<{ Params: { id: string }; Querystring: ShiftQuery }>(
    "/api/shifts/schedule/employee/:id/month",
    { ...read, preHandler: manual },
    (req) => options.service.month(req.params.id, req.query, req.user),
  );
  app.post<{ Body: MatrixInput }>(
    "/api/shifts/schedule/matrix",
    { ...read, preHandler: validateRequest("body", CalendarMatrixRequestSchema) },
    (req) => options.service.matrix(req.body, req.user),
  );
  app.get<{ Params: { employeeId: string; year: string; month: string } }>(
    "/api/shifts/monthly-plan/:employeeId/:year/:month",
    { ...write, preHandler: validateRequest("params", z.unknown()) },
    (req) => options.service.monthlyPlan(req.params.employeeId, req.params.year, req.params.month),
  );
  app.post<{ Body: MonthlyPlanInput }>(
    "/api/shifts/monthly-plan",
    { ...write, preHandler: validateRequest("body", MonthlyPlanRequestSchema) },
    (req) => options.service.saveMonthlyPlan(req.body),
  );
  app.get<{ Querystring: ShiftQuery }>(
    "/api/shifts/suggest-pattern-name",
    { ...write, preHandler: manual },
    (req) => options.service.suggest(req.query),
  );
  app.post<{ Body: ConflictInput }>(
    "/api/shifts/validate-conflicts",
    { ...write, preHandler: validateRequest("body", ConflictValidationSchema) },
    (req) => options.service.conflicts(req.body),
  );
};
