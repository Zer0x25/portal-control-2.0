import type {} from "../../../platform/fastify/types";
import type { FastifyPluginAsync, onRequestHookHandler } from "fastify";
import { z } from "zod";
import {
  CorrectionRequestSchema,
  UpdateCorrectionStatusSchema,
} from "../../../models/schemas/time-correction.schemas";
import { validateRequest } from "../../../platform/fastify/validation";
import { ForbiddenError } from "../../../utils/AppError";
import type { CorrectionFlows } from "../application/flows";
import type {
  CorrectionInput,
  CorrectionQuery,
  CorrectionStatusInput,
} from "../application/contracts";
export const correctionsPlugin: FastifyPluginAsync<{
  service: CorrectionFlows;
  authenticate: onRequestHookHandler;
}> = async (app, options) => {
  const read = { config: { requiresAuth: true }, onRequest: options.authenticate };
  const resolver: onRequestHookHandler = async (request) => {
    if (
      !request.user?.role ||
      !["Administrador", "Supervisor_Elevado", "Supervisor"].includes(request.user.role)
    )
      throw new ForbiddenError(
        "Acceso denegado: Solo Supervisor, Supervisor Elevado o Administrador pueden resolver correcciones",
      );
  };
  const params = z.object({ id: z.string() });
  app.get<{ Querystring: CorrectionQuery }>(
    "/api/corrections",
    { ...read, preHandler: validateRequest("query", z.unknown()) },
    (req) => options.service.list(req.query, req.user),
  );
  app.get(
    "/api/corrections/stats",
    { ...read, preHandler: validateRequest("query", z.unknown()) },
    (req) => options.service.stats(req.user),
  );
  app.get<{ Params: { id: string } }>(
    "/api/corrections/:id/history",
    { ...read, preHandler: validateRequest("params", params) },
    (req) => options.service.history(req.params.id, req.user),
  );
  app.post<{ Body: CorrectionInput }>(
    "/api/corrections",
    { ...read, preHandler: validateRequest("body", CorrectionRequestSchema) },
    async (req, reply) => {
      const result = await options.service.create(req.body, req.user);
      return reply.code(result.status).send(result.body);
    },
  );
  app.patch<{ Params: { id: string }; Body: CorrectionStatusInput }>(
    "/api/corrections/:id/status",
    {
      config: { requiresAuth: true },
      onRequest: [options.authenticate, resolver],
      preHandler: [
        validateRequest("params", params),
        validateRequest("body", UpdateCorrectionStatusSchema),
      ],
    },
    (req) => options.service.updateStatus(req.params.id, req.body, req.user),
  );
};
