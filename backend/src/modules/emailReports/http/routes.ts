import type {} from "../../../platform/fastify/types";
import type { FastifyPluginAsync, onRequestHookHandler } from "fastify";
import { z } from "zod";
import {
  EmailConfigSchema,
  EmailRulesSchema,
  SendTestEmailSchema,
} from "../../../models/schemas/email.schemas";
import { ScheduledReportSchema } from "../../../models/schemas/report.schemas";
import { validateRequest } from "../../../platform/fastify/validation";
import { ForbiddenError } from "../../../utils/AppError";
import type { EmailReportFlows } from "../application/flows";
import type { EmailNotificationRules, ScheduledReportData } from "../application/contracts";
export const emailReportsPlugin: FastifyPluginAsync<{
  service: EmailReportFlows;
  authenticate: onRequestHookHandler;
}> = async (app, options) => {
  const elevated: onRequestHookHandler = async (req) => {
    if (!req.user || !["Administrador", "Supervisor_Elevado"].includes(req.user.role))
      throw new ForbiddenError(
        "Acceso denegado: Se requieren permisos de nivel superior (Administrador o Supervisor Elevado)",
      );
  };
  const base = { config: { requiresAuth: true }, onRequest: [options.authenticate, elevated] };
  const noQuery = { ...base, preHandler: validateRequest("query", z.unknown()) };
  const id = { ...base, preHandler: validateRequest("params", z.object({ id: z.string() })) };
  // Verify validation is owned by the shared flow to retain its custom error message.
  app.post(
    "/api/email/verify",
    { ...base, preHandler: validateRequest("body", z.unknown()) },
    (req) => options.service.verify(req.body),
  );
  app.get("/api/email/config", noQuery, () => options.service.config());
  app.post(
    "/api/email/config",
    { ...base, preHandler: validateRequest("body", EmailConfigSchema) },
    (req) => options.service.saveConfig(req.body),
  );
  app.get("/api/email/rules", noQuery, () => options.service.rules());
  app.post<{ Body: EmailNotificationRules }>(
    "/api/email/rules",
    { ...base, preHandler: validateRequest("body", EmailRulesSchema) },
    (req) => options.service.saveRules(req.body),
  );
  app.post<{ Body: { to: string; subject: string; message: string } }>(
    "/api/email/send-test",
    { ...base, preHandler: validateRequest("body", SendTestEmailSchema) },
    (req) => options.service.send(req.body),
  );
  app.get("/api/scheduled-reports", noQuery, () => options.service.list());
  app.get<{ Params: { id: string } }>("/api/scheduled-reports/:id", id, (req) =>
    options.service.get(req.params.id),
  );
  app.post<{ Body: ScheduledReportData }>(
    "/api/scheduled-reports",
    { ...base, preHandler: validateRequest("body", ScheduledReportSchema) },
    async (req, reply) =>
      reply.code(201).send(await options.service.create(req.body, req.user?.username)),
  );
  app.put<{ Params: { id: string }; Body: Partial<ScheduledReportData> }>(
    "/api/scheduled-reports/:id",
    { ...base, preHandler: validateRequest("body", ScheduledReportSchema.partial()) },
    (req) => options.service.update(req.params.id, req.body),
  );
  app.patch<{ Params: { id: string } }>("/api/scheduled-reports/:id/toggle", id, (req) =>
    options.service.toggle(req.params.id),
  );
  app.delete<{ Params: { id: string } }>("/api/scheduled-reports/:id", id, async (req, reply) => {
    await options.service.remove(req.params.id);
    return reply.code(204).send();
  });
};
