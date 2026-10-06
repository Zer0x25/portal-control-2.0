import type {} from "../../../platform/fastify/types";
import type { FastifyPluginAsync, onRequestHookHandler } from "fastify";
import { z } from "zod";
import {
  HolidaySchema,
  BulkHolidaySchema,
  HolidayQuerySchema,
} from "../../../models/schemas/holiday.schemas";
import { validateRequest } from "../../../platform/fastify/validation";
import type { GetHolidays } from "../application/contracts";
import type { HolidayInput, createHolidayCommands } from "../application/commands";
import {
  holidayRecordResponse,
  holidayQueryResponse,
  holidayBulkResponse,
  holidaySyncResponse,
} from "./responseSchemas";
import { ForbiddenError } from "../../../utils/AppError";

export interface HolidayHttpService {
  getHolidays: GetHolidays;
  upsertHoliday(
    data: HolidayInput,
    actor: string,
  ): ReturnType<ReturnType<typeof createHolidayCommands>["upsert"]>;
  bulkUpsertHolidays(data: HolidayInput[], actor: string): Promise<number>;
  deleteHoliday(id: string, actor: string): Promise<void>;
  syncExternalHolidays(
    year?: number,
    actor?: string,
  ): ReturnType<ReturnType<typeof createHolidayCommands>["sync"]>;
}
interface HolidayPluginOptions {
  service: HolidayHttpService;
  authenticate: onRequestHookHandler;
}
const supervisorRoles = ["Administrador", "Supervisor_Elevado", "Supervisor", "Reloj_Control"];
const yearSchema = z.object({ year: z.number().int().min(2000).max(2100) });
const paramsSchema = z.object({ id: z.string().min(1) });
const querySchema = HolidayQuerySchema.extend({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  search: z.string().optional(),
  showArchived: z.string().optional(),
});

export const holidayPlugin: FastifyPluginAsync<HolidayPluginOptions> = async (app, options) => {
  app.addHook("onRequest", options.authenticate);
  const authorize = async (request: Parameters<onRequestHookHandler>[0]) => {
    if (!request.user || !supervisorRoles.includes(request.user.role))
      throw new ForbiddenError("Acceso denegado: Se requieren permisos de Supervisor o superior");
  };
  app.get<{
    Querystring: {
      since?: string;
      page?: string;
      pageSize?: string;
      search?: string;
      showArchived?: string;
    };
  }>(
    "/api/holidays",
    {
      config: { requiresAuth: true },
      schema: { response: { 200: holidayQueryResponse } },
      preHandler: validateRequest("query", querySchema),
    },
    async ({ query }) =>
      options.service.getHolidays({
        since: query.since,
        page: query.page ? parseInt(query.page, 10) : undefined,
        pageSize: query.pageSize ? parseInt(query.pageSize, 10) : undefined,
        search: query.search,
        showArchived: query.showArchived === "true",
      }),
  );
  app.post<{ Body: z.infer<typeof HolidaySchema> }>(
    "/api/holidays",
    {
      config: { requiresAuth: true, roles: supervisorRoles },
      onRequest: authorize,
      preHandler: validateRequest("body", HolidaySchema),
      schema: { response: { 201: holidayRecordResponse } },
    },
    async (request, reply) =>
      reply
        .code(201)
        .send(await options.service.upsertHoliday(request.body, request.user!.username)),
  );
  app.post<{ Body: z.infer<typeof BulkHolidaySchema> }>(
    "/api/holidays/bulk",
    {
      config: { requiresAuth: true, roles: supervisorRoles },
      onRequest: authorize,
      bodyLimit: 10 * 1024 * 1024,
      preHandler: validateRequest("body", BulkHolidaySchema),
      schema: { response: { 201: holidayBulkResponse } },
    },
    async (request, reply) =>
      reply.code(201).send({
        count: await options.service.bulkUpsertHolidays(request.body, request.user!.username),
      }),
  );
  app.post<{ Body: { year: number } }>(
    "/api/holidays/sync",
    {
      config: { requiresAuth: true, roles: supervisorRoles },
      onRequest: authorize,
      preHandler: validateRequest("body", yearSchema),
      schema: { response: { 200: holidaySyncResponse } },
    },
    async (request) =>
      options.service.syncExternalHolidays(request.body.year, request.user!.username),
  );
  app.delete<{ Params: { id: string } }>(
    "/api/holidays/:id",
    {
      config: { requiresAuth: true, roles: supervisorRoles },
      onRequest: authorize,
      preHandler: validateRequest("params", paramsSchema),
    },
    async (request, reply) => {
      await options.service.deleteHoliday(request.params.id, request.user!.username);
      return reply.code(204).send();
    },
  );
};
