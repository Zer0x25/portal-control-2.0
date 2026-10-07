import type {} from "../../../platform/fastify/types";
import type { FastifyPluginAsync, onRequestHookHandler } from "fastify";
import { validateRequest } from "../../../platform/fastify/validation";
import { ForbiddenError } from "../../../utils/AppError";
import type { MeterFlows } from "../application/flows";
import type { MeterListParams } from "../application/contracts";
import {
  MeterReadingQuerySchema,
  BulkMeterReadingSchema,
} from "../../../models/schemas/meter.schemas";
export const metersPlugin: FastifyPluginAsync<{
  service: MeterFlows;
  authenticate: onRequestHookHandler;
}> = async (app, options) => {
  const supervisor: onRequestHookHandler = async (req) => {
    if (
      !req.user ||
      !["Administrador", "Supervisor_Elevado", "Supervisor", "Reloj_Control"].includes(
        req.user.role,
      )
    )
      throw new ForbiddenError("Acceso denegado: Se requieren permisos de Supervisor o superior");
  };
  const base = { config: { requiresAuth: true }, onRequest: [options.authenticate, supervisor] };
  app.get<{ Querystring: MeterListParams }>(
    "/api/meters",
    { ...base, preHandler: validateRequest("query", MeterReadingQuerySchema) },
    (req) => options.service.list(req.query),
  );
  app.post(
    "/api/meters/bulk",
    { ...base, preHandler: validateRequest("body", BulkMeterReadingSchema) },
    async (req, reply) => reply.code(201).send(await options.service.create(req.body)),
  );
};
