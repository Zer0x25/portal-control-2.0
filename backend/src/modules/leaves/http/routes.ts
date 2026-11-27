import type {} from "../../../platform/fastify/types";
import type { FastifyPluginAsync, onRequestHookHandler } from "fastify";
import { z } from "zod";
import { LeaveRecordSchema, LeaveQuerySchema } from "../../../models/schemas/leave.schemas";
import { validateRequest } from "../../../platform/fastify/validation";
import { ForbiddenError } from "../../../utils/AppError";
import type { LeaveFlows } from "../application/flows";
import type { LeaveQuery } from "../application/contracts";
const READ_ROLES = [
  "Super_Administrador",
  "Administrador",
  "Supervisor",
  "Reloj_Control",
  "Fiscalizador",
];
const WRITE_ROLES = ["Super_Administrador", "Administrador", "Supervisor"];

export const leavesPlugin: FastifyPluginAsync<{
  service: LeaveFlows;
  authenticate: onRequestHookHandler;
}> = async (app, options) => {
  const requireRoles =
    (roles: string[]): onRequestHookHandler =>
    async (request) => {
      if (!request.user?.role || !roles.includes(request.user.role))
        throw new ForbiddenError("Acceso denegado: Se requieren permisos de Supervisor o superior");
    };
  const readRoute = {
    config: { requiresAuth: true, roles: READ_ROLES },
    onRequest: [options.authenticate, requireRoles(READ_ROLES)],
  };
  const writeRoute = {
    config: { requiresAuth: true, roles: WRITE_ROLES },
    onRequest: [options.authenticate, requireRoles(WRITE_ROLES)],
  };
  app.get<{ Querystring: LeaveQuery }>(
    "/api/leaves",
    { ...readRoute, preHandler: validateRequest("query", LeaveQuerySchema) },
    (req) => options.service.list(req.query, req.user),
  );
  app.post(
    "/api/leaves",
    { ...writeRoute, preHandler: validateRequest("body", LeaveRecordSchema) },
    async (req, reply) =>
      reply.code(201).send(await options.service.upsert(LeaveRecordSchema.parse(req.body))),
  );
  app.delete<{ Params: { id: string } }>(
    "/api/leaves/:id",
    { ...writeRoute, preHandler: validateRequest("params", z.object({ id: z.string() })) },
    (req) => options.service.delete(req.params.id),
  );
};
