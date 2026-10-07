import type {} from "../../../platform/fastify/types";
import type { FastifyPluginAsync, onRequestHookHandler } from "fastify";
import { z } from "zod";
import {
  PunchSchema,
  TimeRecordWriteSchema,
  TimeRecordQuerySchema,
  BulkTimeRecordSchema,
  IntegrityVerifyQuerySchema,
  ResolveAnomalySchema,
} from "../../../models/schemas/time-correction.schemas";
import { validateRequest } from "../../../platform/fastify/validation";
import { sendHttpStream } from "../../../platform/fastify/stream";
import { ForbiddenError } from "../../../utils/AppError";
import type { ExcelHttpStream } from "../../../utils/httpStream";
import type { RecordFlows } from "../application/flows";
import type {
  AnomalyResolution,
  PunchInput,
  RecordInput,
  RecordQuery,
  ExportFilters,
} from "../application/contracts";
export interface RecordsHttpService extends RecordFlows {
  exportStream(
    format: "csv" | "xml" | "excel",
    stream: ExcelHttpStream,
    filters: ExportFilters,
  ): Promise<void>;
}
export const recordsPlugin: FastifyPluginAsync<{
  service: RecordsHttpService;
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
  const read = { config: { requiresAuth: true }, onRequest: options.authenticate };
  const write = { config: { requiresAuth: true }, onRequest: [options.authenticate, supervisor] };
  const params = z.object({ id: z.string() });
  app.post<{ Body: PunchInput }>(
    "/api/records/punch",
    { ...read, preHandler: validateRequest("body", PunchSchema) },
    (req) => options.service.punch(req.body, req.user),
  );
  app.get<{ Querystring: RecordQuery }>(
    "/api/records",
    { ...read, preHandler: validateRequest("query", TimeRecordQuerySchema) },
    (req) => options.service.list(req.query, req.user),
  );
  app.post<{ Body: RecordInput }>(
    "/api/records",
    { ...write, preHandler: validateRequest("body", TimeRecordWriteSchema) },
    (req) => options.service.save(req.body, req.user?.username || "SYSTEM"),
  );
  app.post<{ Body: RecordInput[] }>(
    "/api/records/bulk",
    {
      ...write,
      bodyLimit: 10 * 1024 * 1024,
      preHandler: validateRequest("body", BulkTimeRecordSchema),
    },
    (req) => options.service.bulk(req.body, req.user?.username || "SYSTEM"),
  );
  app.post(
    "/api/records/auto-close",
    { ...write, preHandler: validateRequest("body", z.unknown()) },
    () => options.service.autoClose(),
  );
  app.get<{ Querystring: { employeeId?: string; from?: string; to?: string; limit?: string } }>(
    "/api/records/integrity/verify",
    { ...write, preHandler: validateRequest("query", IntegrityVerifyQuerySchema) },
    (req) =>
      options.service.verify({
        ...req.query,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      }),
  );
  app.post<{ Params: { id: string }; Body: { resolution: AnomalyResolution } }>(
    "/api/records/:id/resolve-anomaly",
    {
      ...write,
      preHandler: [
        validateRequest("params", params),
        validateRequest("body", ResolveAnomalySchema),
      ],
    },
    (req) =>
      options.service.resolve(req.params.id, req.body.resolution, req.user?.username || "SYSTEM"),
  );
  app.delete<{ Params: { id: string } }>(
    "/api/records/:id",
    { ...write, preHandler: validateRequest("params", params) },
    async (req, reply) => {
      await options.service.delete(req.params.id, req.user?.username || "SYSTEM");
      return reply.code(204).send();
    },
  );
  app.get<{ Querystring: Record<string, unknown> }>(
    "/api/records/export",
    { ...read, preHandler: validateRequest("query", TimeRecordQuerySchema) },
    async (req, reply) => {
      const { format, filters } = await options.service.prepareExport(req.query, req.user);
      if (format !== "csv" && format !== "xml" && format !== "excel")
        return options.service.exportJson(filters);
      const contentType =
        format === "csv"
          ? "text/csv; charset=utf-8"
          : format === "xml"
            ? "application/xml; charset=utf-8"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const filename =
        format === "excel"
          ? `registros_horario_${filters.startDate}_${filters.endDate}.xlsx`
          : `master_data_${filters.startDate}_${filters.endDate}.${format}`;
      return sendHttpStream(
        reply,
        { "Content-Type": contentType, "Content-Disposition": `attachment; filename=${filename}` },
        (sink) => options.service.exportStream(format, sink, filters),
        "Error al exportar datos",
      );
    },
  );
};
