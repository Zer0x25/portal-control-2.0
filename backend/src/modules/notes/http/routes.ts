import type {} from "../../../platform/fastify/types";
import type { FastifyPluginAsync, onRequestHookHandler } from "fastify";
import { z } from "zod";
import { validateRequest } from "../../../platform/fastify/validation";
import { ForbiddenError } from "../../../utils/AppError";
import type { NoteFlows } from "../application/flows";
import type { NoteListParams } from "../application/contracts";
import { QuickNoteQuerySchema, QuickNoteSchema } from "../../../models/schemas/note.schemas";
export const notesPlugin: FastifyPluginAsync<{
  service: NoteFlows;
  authenticate: onRequestHookHandler;
}> = async (app, options) => {
  const supervisor: onRequestHookHandler = async (req) => {
    if (
      !req.user ||
      !["Administrador", "Supervisor_Elevado", "Supervisor", "Reloj_Control"].includes(
        req.user.role,
      )
    )
      throw new ForbiddenError("Acceso denegado: Se requieren permisos de Supervisor o superior");
  };
  const base = { config: { requiresAuth: true }, onRequest: [options.authenticate, supervisor] };
  const id = { ...base, preHandler: validateRequest("params", z.object({ id: z.string() })) };
  app.get<{ Querystring: NoteListParams }>(
    "/api/notes",
    { ...base, preHandler: validateRequest("query", QuickNoteQuerySchema) },
    (req) => options.service.list(req.query),
  );
  app.post(
    "/api/notes",
    { ...base, preHandler: validateRequest("body", QuickNoteSchema) },
    async (req, reply) =>
      reply.code(201).send(await options.service.create(req.body, req.user?.username || "")),
  );
  app.put<{ Params: { id: string } }>("/api/notes/:id", id, (req) =>
    options.service.archive(req.params.id, req.user?.username || ""),
  );
  app.delete<{ Params: { id: string } }>("/api/notes/:id", id, (req) =>
    options.service.remove(req.params.id, req.user?.username || ""),
  );
};
