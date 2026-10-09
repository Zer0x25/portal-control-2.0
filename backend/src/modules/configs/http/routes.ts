import type {} from "../../../platform/fastify/types";
import type { FastifyPluginAsync, onRequestHookHandler } from "fastify";
import { z } from "zod";
import { validateRequest } from "../../../platform/fastify/validation";
import { ForbiddenError } from "../../../utils/AppError";
import multipart from "@fastify/multipart";
import { UploadError } from "../../../utils/UploadError";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import type { Readable } from "node:stream";
import type { ConfigFlows } from "../application/flows";
import type { PolicyFile } from "../application/contracts";
import { validateBrandLogoMime } from "../application/brandLogo";
import { ValidationError } from "../../../utils/AppError";
export interface ConfigHttpService extends ConfigFlows {
  storePolicy(stream: Readable, name: string, mime: string): Promise<PolicyFile>;
  removeUploaded(filename: string): Promise<void>;
  storeLogo(stream: Readable, name: string, mime: string): Promise<PolicyFile>;
  removeUploadedLogo(filename: string): Promise<void>;
}
export const configsPlugin: FastifyPluginAsync<{
  service: ConfigHttpService;
  authenticate: onRequestHookHandler;
}> = async (app, options) => {
  await app.register(multipart, { limits: { fileSize: 15 * 1024 * 1024 } });
  await app.register(fastifyStatic, { serve: false });
  const admin: onRequestHookHandler = async (req) => {
    if (req.user?.role !== "Administrador")
      throw new ForbiddenError("Acceso denegado: Se requieren permisos de Administrador");
  };
  const auth = { config: { requiresAuth: true }, onRequest: [options.authenticate] };
  const elevated = { config: { requiresAuth: true }, onRequest: [options.authenticate, admin] };
  const noQuery = validateRequest("query", z.unknown());
  app.get("/api/configs/public/company-policy", { preHandler: noQuery }, async (_req, reply) => {
    const value = await options.service.policy();
    return value || reply.code(404).send({ message: "No hay reglamento cargado" });
  });
  app.get(
    "/api/configs/public/company-policy/file",
    { preHandler: noQuery },
    async (_req, reply) => {
      const file = await options.service.download();
      if (!file) return reply.code(404).send({ message: "No hay reglamento cargado" });
      return reply
        .header("Content-Type", "application/pdf")
        .header(
          "Content-Disposition",
          `inline; filename="${encodeURIComponent(file.originalName)}"`,
        )
        .sendFile(path.basename(file.path), path.dirname(file.path));
    },
  );
  app.get("/api/configs/server-time", { ...auth, preHandler: noQuery }, () =>
    options.service.time(),
  );
  app.get("/api/configs/public/brand-logo", { preHandler: noQuery }, async (_req, reply) => {
    const value = await options.service.brandLogo();
    return value || reply.code(404).send({ message: "No hay logo configurado" });
  });
  app.get("/api/configs/public/brand-logo/file", { preHandler: noQuery }, async (_req, reply) => {
    const file = await options.service.downloadLogo();
    if (!file) return reply.code(404).send({ message: "No hay logo configurado" });
    const contentType = file.originalName.toLowerCase().endsWith(".png")
      ? "image/png"
      : file.originalName.toLowerCase().endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";
    return reply
      .header("Content-Type", contentType)
      .header("Content-Disposition", `inline; filename="${encodeURIComponent(file.originalName)}"`)
      .sendFile(path.basename(file.path), path.dirname(file.path));
  });
  app.get<{ Querystring: { date?: string } }>(
    "/api/configs/validate-closure",
    { ...elevated, preHandler: noQuery },
    (req) => options.service.closure(req.query.date),
  );
  app.get("/api/configs", { ...auth, preHandler: noQuery }, (req) =>
    options.service.list(req.user?.role),
  );
  app.get<{ Params: { key: string } }>(
    "/api/configs/:key",
    { ...auth, preHandler: validateRequest("params", z.object({ key: z.string() })) },
    async (req, reply) =>
      reply
        .type("application/json")
        .send(JSON.stringify(await options.service.get(req.params.key, req.user?.role))),
  );
  app.post<{ Params: { key: string }; Body: { value: unknown } }>(
    "/api/configs/:key",
    { ...elevated, preHandler: validateRequest("body", z.object({ value: z.unknown() })) },
    async (req, reply) =>
      reply
        .type("application/json")
        .send(
          JSON.stringify(
            await options.service.set(req.params.key, req.body.value, req.user?.username),
          ),
        ),
  );
  app.post(
    "/api/configs/company-policy",
    { ...elevated, preHandler: validateRequest("query", z.unknown()) },
    async (req, reply) => {
      let stored: PolicyFile | undefined;
      try {
        if (req.isMultipart())
          for await (const part of req.parts()) {
            if (part.type !== "file") continue;
            if (part.fieldname !== "file" || stored) {
              part.file.resume();
              throw new UploadError("LIMIT_UNEXPECTED_FILE", part.fieldname);
            }
            if (part.mimetype !== "application/pdf") {
              part.file.resume();
              throw new ValidationError("Solo se permiten archivos PDF");
            }
            stored = await options.service.storePolicy(part.file, part.filename, part.mimetype);
            if (part.file.truncated) throw new UploadError("LIMIT_FILE_SIZE");
          }
      } catch (error) {
        if (stored) await options.service.removeUploaded(stored.filename);
        if (error instanceof app.multipartErrors.RequestFileTooLargeError)
          throw new UploadError("LIMIT_FILE_SIZE");
        throw error;
      }
      return reply.code(201).send(await options.service.upload(stored, req.user?.username));
    },
  );
  app.post(
    "/api/configs/brand-logo",
    { ...elevated, preHandler: validateRequest("query", z.unknown()) },
    async (req, reply) => {
      let stored: PolicyFile | undefined;
      try {
        if (req.isMultipart())
          for await (const part of req.parts()) {
            if (part.type !== "file") continue;
            if (part.fieldname !== "file" || stored) {
              part.file.resume();
              throw new UploadError("LIMIT_UNEXPECTED_FILE", part.fieldname);
            }
            validateBrandLogoMime(part.mimetype);
            stored = await options.service.storeLogo(part.file, part.filename, part.mimetype);
            if (part.file.truncated) throw new UploadError("LIMIT_FILE_SIZE");
          }
      } catch (error) {
        if (stored) await options.service.removeUploadedLogo(stored.filename);
        if (error instanceof app.multipartErrors.RequestFileTooLargeError)
          throw new UploadError("LIMIT_FILE_SIZE");
        throw error;
      }
      return reply.code(201).send(await options.service.uploadLogo(stored, req.user?.username));
    },
  );
};
