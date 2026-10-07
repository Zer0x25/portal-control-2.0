import type {} from "../../../platform/fastify/types";
import type {
  FastifyPluginAsync,
  onRequestHookHandler,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import multipart from "@fastify/multipart";
import { UploadError } from "../../../utils/UploadError";
import { z } from "zod";
import { ForbiddenError } from "../../../utils/AppError";
import { ExportQuerySchema } from "../../../models/schemas/time-correction.schemas";
import { validateRequest } from "../../../platform/fastify/validation";
import { sendHttpStream } from "../../../platform/fastify/stream";
import { mapHttpError } from "../../../utils/httpError";
import type { ExcelHttpStream } from "../../../utils/httpStream";
import type { ImportExportFlows } from "../application/flows";
export type ImportExportHttpService = ImportExportFlows<ExcelHttpStream, Uint8Array>;
export const importExportPlugin: FastifyPluginAsync<{
  service: ImportExportHttpService;
  authenticate: onRequestHookHandler;
  auditStreamError(error: unknown, request: FastifyRequest): Promise<void>;
}> = async (app, options) => {
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024, files: 1 } });
  const supervisor: onRequestHookHandler = async (req) => {
    if (
      !req.user?.role ||
      !["Administrador", "Supervisor_Elevado", "Supervisor", "Reloj_Control"].includes(
        req.user.role,
      )
    )
      throw new ForbiddenError("Acceso denegado: Se requieren permisos de Supervisor o superior");
  };
  const auth = { config: { requiresAuth: true }, onRequest: [options.authenticate] };
  const elevated = {
    config: { requiresAuth: true },
    onRequest: [options.authenticate, supervisor],
  };
  const sendPdf = (reply: FastifyReply, file: { bytes: Uint8Array; filename: string }) =>
    reply
      .header("Content-Type", "application/pdf")
      .header("Content-Disposition", `attachment; filename=${file.filename}`)
      .header("Content-Length", file.bytes.byteLength)
      .send(Buffer.from(file.bytes));
  app.post(
    "/api/import/preview",
    { ...elevated, preHandler: validateRequest("query", z.unknown()) },
    async (req) => {
      let file: Buffer | undefined, schema: string | undefined;
      try {
        if (req.isMultipart())
          for await (const part of req.parts()) {
            if (part.type === "field") {
              if (part.fieldname === "schema") {
                const next =
                  typeof part.value === "string" ? part.value : JSON.stringify(part.value);
                schema = schema !== undefined ? schema + "," + next : next;
              }
              continue;
            }
            if (part.fieldname !== "file" || file) {
              part.file.resume();
              throw new UploadError("LIMIT_UNEXPECTED_FILE", part.fieldname);
            }
            file = await part.toBuffer();
            if (part.file.truncated) throw new UploadError("LIMIT_FILE_SIZE");
          }
      } catch (error) {
        if (error instanceof app.multipartErrors.RequestFileTooLargeError)
          throw new UploadError("LIMIT_FILE_SIZE");
        if (error instanceof app.multipartErrors.FilesLimitError)
          throw new UploadError("LIMIT_FILE_COUNT");
        throw error;
      }
      return options.service.preview(file, schema);
    },
  );
  for (const [path, kind] of [
    ["calendar-pdf", "calendar"],
    ["report-pdf", "detailed"],
  ] as const) {
    app.get(
      `/api/export/${path}`,
      { ...auth, preHandler: validateRequest("query", ExportQuerySchema) },
      async (req, reply) => {
        const result = await options.service.pdf(kind, req.query, req.user);
        if (result.denied === true) return reply.code(403).send({ message: result.message });
        return sendPdf(reply, result);
      },
    );
  }
  app.get<{ Params: { id: string } }>(
    "/api/export/shift-report-pdf/:id",
    { ...elevated, preHandler: validateRequest("params", z.object({ id: z.string() })) },
    async (req, reply) => sendPdf(reply, await options.service.shiftPdf(req.params.id)),
  );
  app.get(
    "/api/export/report-excel",
    { ...auth, preHandler: validateRequest("query", ExportQuerySchema) },
    async (req, reply) => {
      const filters = await options.service.prepareExcel(req.query, req.user);
      return sendHttpStream(
        reply,
        {},
        (sink) => options.service.excel(sink, filters),
        "Error al exportar reporte a Excel",
        async (error) => {
          await options.auditStreamError(error, req);
          return mapHttpError(error, false);
        },
      );
    },
  );
};
