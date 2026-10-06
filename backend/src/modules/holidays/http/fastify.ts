import type { FastifyPluginAsync, preHandlerHookHandler } from "fastify";
import type { GetHolidays } from "../application/contracts";

export interface HolidayHttpOptions {
  getHolidays: GetHolidays;
  authenticate: preHandlerHookHandler;
  mapError(error: unknown): { statusCode: number; body: unknown };
}

/** Pilot plugin: not mounted by the production Express application. */
interface HolidayQuerystring {
  since?: string;
  page?: string;
  pageSize?: string;
  search?: string;
  showArchived?: string;
}

export const holidayQueryPlugin: FastifyPluginAsync<HolidayHttpOptions> = async (app, options) => {
  app.setErrorHandler((error, _request, reply) => {
    const response = options.mapError(error);
    return reply.code(response.statusCode).send(response.body);
  });
  app.get<{ Querystring: HolidayQuerystring }>(
    "/api/holidays",
    {
      preHandler: options.authenticate,
      schema: {
        querystring: {
          type: "object",
          properties: {
            since: { type: "string" },
            page: { type: "string" },
            pageSize: { type: "string" },
            search: { type: "string" },
            showArchived: { type: "string" },
          },
          additionalProperties: true,
        },
      },
    },
    async ({ query }) =>
      options.getHolidays({
        since: query.since,
        page: query.page ? parseInt(query.page, 10) : undefined,
        pageSize: query.pageSize ? parseInt(query.pageSize, 10) : undefined,
        search: query.search,
        showArchived: query.showArchived === "true",
      }),
  );
};
