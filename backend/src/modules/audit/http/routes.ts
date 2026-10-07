import type {} from "../../../platform/fastify/types";
import type { FastifyPluginAsync, onRequestHookHandler, FastifyRequest } from "fastify";
import { z } from "zod";
import type { AuditFlows } from "../application/flows";
import type { AuditQuery, AuditEntry } from "../application/contracts";
import type { ExcelHttpStream } from "../../../utils/httpStream";
import { ForbiddenError } from "../../../utils/AppError";
import { validateRequest } from "../../../platform/fastify/validation";
import { sendHttpStream } from "../../../platform/fastify/stream";
import { mapHttpError } from "../../../utils/httpError";
import { AuditLogQuerySchema, AuditLogCleanupSchema } from "../../../models/schemas/audit.schemas";
import { AuditLogSchema } from "../../../models/schemas/core.schemas";
export const auditPlugin: FastifyPluginAsync<{
  service: AuditFlows<ExcelHttpStream>;
  authenticate: onRequestHookHandler;
  auditStreamError(error: unknown, request: FastifyRequest): Promise<void>;
}> = async (app, options) => {
  const viewer: onRequestHookHandler = async (req) => {
    if (
      !req.user ||
      !["Administrador", "Supervisor_Elevado", "Fiscalizador"].includes(req.user.role)
    )
      throw new ForbiddenError("Acceso denegado: Se requieren permisos de auditoría");
  };
  const elevated: onRequestHookHandler = async (req) => {
    if (!req.user || !["Administrador", "Supervisor_Elevado"].includes(req.user.role))
      throw new ForbiddenError(
        "Acceso denegado: Se requieren permisos de nivel superior (Administrador o Supervisor Elevado)",
      );
  };
  const session = { config: { requiresAuth: true }, onRequest: [options.authenticate] };
  const read = { ...session, onRequest: [options.authenticate, viewer] };
  const write = { ...session, onRequest: [options.authenticate, elevated] };
  // Legacy endpoints have no additional input schema. The marker exposes that contract.
  const noQuery = validateRequest("query", z.unknown());
  app.get<{ Querystring: AuditQuery }>(
    "/api/audit-logs",
    { ...read, preHandler: validateRequest("query", AuditLogQuerySchema) },
    (req) => options.service.list(req.query),
  );
  app.post<{ Body: AuditEntry }>(
    "/api/audit-logs",
    { ...session, preHandler: validateRequest("body", AuditLogSchema) },
    async (req, reply) =>
      reply
        .code(201)
        .send(await options.service.create(req.body, { username: req.user?.username, ip: req.ip })),
  );
  app.post<{ Body: { months?: string | number } }>(
    "/api/audit-logs/cleanup",
    { ...write, preHandler: validateRequest("body", AuditLogCleanupSchema) },
    (req) => options.service.cleanup(req.body),
  );
  app.get("/api/audit-logs/integrity-status", { ...read, preHandler: noQuery }, () =>
    options.service.status(),
  );
  app.get("/api/audit-logs/verify-integrity", { ...write, preHandler: noQuery }, () =>
    options.service.verify(),
  );
  app.get<{ Querystring: AuditQuery }>(
    "/api/audit-logs/export",
    { ...read, preHandler: noQuery },
    async (req, reply) => {
      if (req.query.format !== "csv" && req.query.format !== "xml")
        return options.service.exportJson(req.query);
      return sendHttpStream(
        reply,
        {},
        (sink) => options.service.exportStream(sink, req.query),
        "Error al exportar logs de auditoría",
        async (error) => {
          await options.auditStreamError(error, req);
          return mapHttpError(error, false);
        },
      );
    },
  );
};
