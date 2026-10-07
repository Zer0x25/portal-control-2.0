import type {} from "../../../platform/fastify/types";
import type { FastifyPluginAsync, onRequestHookHandler } from "fastify";
import { z } from "zod";
import { KpiSummaryRequestSchema } from "../../../models/schemas/core.schemas";
import { validateRequest } from "../../../platform/fastify/validation";
import { ForbiddenError } from "../../../utils/AppError";
import type { KpiFlows } from "../application/flows";
import type { KpiInput } from "../application/contracts";
export const kpisPlugin: FastifyPluginAsync<{
  service: KpiFlows;
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
  app.post<{ Body: KpiInput }>(
    "/api/kpis/summary",
    { ...protectedRoute, preHandler: validateRequest("body", KpiSummaryRequestSchema) },
    (req) => options.service.summary(req.body),
  );
  app.post<{ Body: KpiInput }>(
    "/api/kpis/detailed-report",
    { ...protectedRoute, preHandler: validateRequest("body", KpiSummaryRequestSchema) },
    (req) => options.service.detailed(req.body),
  );
  // No functional query parameters; marker records the intentionally empty contract.
  app.get(
    "/api/kpis/overview",
    { ...protectedRoute, preHandler: validateRequest("query", z.unknown()) },
    () => options.service.overview(),
  );
  app.get(
    "/api/kpis/daily-planning",
    { ...protectedRoute, preHandler: validateRequest("query", z.unknown()) },
    () => options.service.daily(),
  );
};
