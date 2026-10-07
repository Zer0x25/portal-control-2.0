import type {} from "../../../platform/fastify/types";
import type { FastifyPluginAsync, onRequestHookHandler } from "fastify";
import { z } from "zod";
import { ForbiddenError } from "../../../utils/AppError";
import { validateRequest } from "../../../platform/fastify/validation";
import { sendProgressStream } from "../../../platform/fastify/progressStream";
import {
  SeedOptionsSchema,
  SeedPhase2StartSchema,
  SeedPhase2JobSchema,
} from "../../../models/schemas/core.schemas";
import type { MaintenanceFlows } from "../application/flows";
import type { SeedOptions, Phase2Options } from "../application/contracts";
export const maintenancePlugin: FastifyPluginAsync<{
  service: MaintenanceFlows;
  authenticate: onRequestHookHandler;
}> = async (app, options) => {
  const admin: onRequestHookHandler = async (req) => {
    if (req.user?.role !== "Administrador")
      throw new ForbiddenError("Acceso denegado: Se requieren permisos de Administrador");
  };
  const base = {
    compress: false as const,
    config: { requiresAuth: true },
    onRequest: [options.authenticate, admin],
  };
  const body = (schema: z.ZodType) => ({ ...base, preHandler: validateRequest("body", schema) });
  const query = { ...base, preHandler: validateRequest("query", z.unknown()) };
  app.delete("/api/maintenance/clear-database", body(z.unknown()), (req, reply) =>
    sendProgressStream(reply, (out) =>
      options.service.clear(
        req.user ? { id: req.user.id, username: req.user.username } : undefined,
        out,
      ),
    ),
  );
  for (const path of ["seed", "seed/phase1"])
    app.post<{ Body: SeedOptions }>(
      `/api/maintenance/${path}`,
      body(SeedOptionsSchema),
      (req, reply) =>
        sendProgressStream(reply, (out) => options.service.seed(req.body, req.user || {}, out)),
    );
  app.post<{ Body: Phase2Options }>(
    "/api/maintenance/seed/phase2/start",
    body(SeedPhase2StartSchema),
    (req) => options.service.startJob(req.body || {}, req.user || {}),
  );
  for (const [path, run] of [
    ["pause", options.service.pauseJob],
    ["resume", options.service.resumeJob],
    ["stop", options.service.stopJob],
  ] as const)
    app.post<{ Body: { jobId: string } }>(
      `/api/maintenance/seed/phase2/${path}`,
      body(SeedPhase2JobSchema),
      (req) => run(req.body),
    );
  app.get<{ Querystring: { jobId?: string } }>(
    "/api/maintenance/seed/phase2/status",
    query,
    (req) => options.service.status(req.query),
  );
  app.get<{ Querystring: { jobId?: string; limit?: string } }>(
    "/api/maintenance/seed/phase2/logs",
    query,
    (req) => options.service.logs(req.query),
  );
};
