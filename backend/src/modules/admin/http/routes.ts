import type {} from "../../../platform/fastify/types";
import type { FastifyPluginAsync, onRequestHookHandler } from "fastify";
import { z } from "zod";
import { ForbiddenError } from "../../../utils/AppError";
import { validateRequest } from "../../../platform/fastify/validation";
import { RestoreBackupSchema } from "../../../models/schemas/core.schemas";
import {
  PurgeSessionsBodySchema,
  ResetPasswordBodySchema,
} from "../../../models/schemas/admin.schemas";
import type { AdminFlows } from "../application/flows";
export const adminPlugin: FastifyPluginAsync<{
  service: AdminFlows;
  authenticate: onRequestHookHandler;
}> = async (app, options) => {
  const admin: onRequestHookHandler = async (req) => {
    if (req.user?.role !== "Administrador")
      throw new ForbiddenError("Acceso denegado: Se requieren permisos de Administrador");
  };
  const base = { config: { requiresAuth: true }, onRequest: [options.authenticate, admin] };
  const query = { ...base, preHandler: validateRequest("query", z.unknown()) };
  const command = { ...base, preHandler: validateRequest("body", z.unknown()) };
  for (const [path, read] of [
    ["stats", options.service.stats],
    ["diagnose-autoclose", options.service.diagnosis],
    ["security-insights", options.service.insights],
    ["integrity-status", options.service.status],
    ["backups", options.service.backups],
  ] as const)
    app.get(`/api/admin/${path}`, query, async () => read());
  app.post("/api/admin/trigger-autoclose", command, (req) =>
    options.service.autoClose(req.user || {}),
  );
  app.post("/api/admin/trigger-accounting-autoclose", command, (req) =>
    options.service.accountingClose(req.user || {}),
  );
  app.post("/api/admin/trigger-backup", command, async (req, reply) => {
    await options.service.backup(req.user || {}, (body) => {
      reply.send(body);
    });
    return reply;
  });
  app.post("/api/admin/restart", command, async (req, reply) => {
    await options.service.restart(req.user || {}, (body) => {
      reply.send(body);
    });
    return reply;
  });
  app.post<{ Body: { username?: string } }>(
    "/api/admin/purge-sessions",
    { ...base, preHandler: validateRequest("body", PurgeSessionsBodySchema) },
    (req) => options.service.purge(req.body, req.user || {}),
  );
  app.post<{ Body: { username: string; newPassword: string } }>(
    "/api/admin/reset-password",
    { ...base, preHandler: validateRequest("body", ResetPasswordBodySchema) },
    (req) => options.service.resetPassword(req.body, req.user || {}),
  );
  app.post<{ Body: { filename: string } }>(
    "/api/admin/restore",
    { ...base, preHandler: validateRequest("body", RestoreBackupSchema) },
    async (req, reply) => {
      await options.service.restore(req.body, req.user || {}, (body) => {
        reply.send(body);
      });
      return reply;
    },
  );
};
