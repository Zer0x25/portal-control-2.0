import type {} from "../../../platform/fastify/types";
import type { FastifyPluginAsync, onRequestHookHandler } from "fastify";
import { z } from "zod";
import { LeaveRecordSchema, LeaveQuerySchema } from "../../../models/schemas/leave.schemas";
import { validateRequest } from "../../../platform/fastify/validation";
import { ForbiddenError } from "../../../utils/AppError";
import type { LeaveFlows } from "../application/flows";
import type { LeaveQuery } from "../application/contracts";
export const leavesPlugin: FastifyPluginAsync<{
  service: LeaveFlows;
  authenticate: onRequestHookHandler;
}> = async (app, options) => {
  const supervisor: onRequestHookHandler = async (request) => {
    if (
      !request.user?.role ||
      !["Administrador", "Supervisor_Elevado", "Supervisor", "Reloj_Control"].includes(
        request.user.role,
      )
    )
      throw new ForbiddenError("Acceso denegado: Se requieren permisos de Supervisor o superior");
  };
  const protectedRoute = {
    config: { requiresAuth: true },
    onRequest: [options.authenticate, supervisor],
  };
  app.get<{ Querystring: LeaveQuery }>(
    "/api/leaves",
    { ...protectedRoute, preHandler: validateRequest("query", LeaveQuerySchema) },
    (req) => options.service.list(req.query, req.user),
  );
  app.post(
    "/api/leaves",
    { ...protectedRoute, preHandler: validateRequest("body", LeaveRecordSchema) },
    async (req, reply) =>
      reply.code(201).send(await options.service.upsert(LeaveRecordSchema.parse(req.body))),
  );
  app.delete<{ Params: { id: string } }>(
    "/api/leaves/:id",
    { ...protectedRoute, preHandler: validateRequest("params", z.object({ id: z.string() })) },
    (req) => options.service.delete(req.params.id),
  );
};
