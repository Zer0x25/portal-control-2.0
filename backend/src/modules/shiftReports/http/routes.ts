import type {} from "../../../platform/fastify/types";
import type { FastifyPluginAsync, onRequestHookHandler } from "fastify";
import { z } from "zod";
import { ShiftReportSchema } from "../../../models/schemas/report.schemas";
import { validateRequest } from "../../../platform/fastify/validation";
import { sendHttpStream } from "../../../platform/fastify/stream";
import { ForbiddenError } from "../../../utils/AppError";
import type { ExcelHttpStream } from "../../../utils/httpStream";
import type { ShiftReportFlows } from "../application/flows";
import type { ShiftReportInput, ShiftReportQuery } from "../application/contracts";
export interface ShiftReportsHttpService extends ShiftReportFlows {
  exportStream(stream: ExcelHttpStream, id: string): Promise<void>;
}
export const shiftReportsPlugin: FastifyPluginAsync<{
  service: ShiftReportsHttpService;
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
  app.get<{ Querystring: ShiftReportQuery }>(
    "/api/shift-reports",
    { ...protectedRoute, preHandler: validateRequest("query", z.unknown()) },
    (req) => options.service.list(req.query),
  );
  app.post<{ Body: ShiftReportInput }>(
    "/api/shift-reports",
    { ...protectedRoute, preHandler: validateRequest("body", ShiftReportSchema) },
    (req) => options.service.save(req.body, req.user?.username || "SYSTEM"),
  );
  app.get<{ Params: { id: string } }>(
    "/api/shift-reports/export/:id",
    { ...protectedRoute, preHandler: validateRequest("params", z.object({ id: z.string() })) },
    (req, reply) =>
      sendHttpStream(
        reply,
        {},
        (sink) => options.service.exportStream(sink, req.params.id),
        "Error al exportar reporte de turno",
      ),
  );
};
