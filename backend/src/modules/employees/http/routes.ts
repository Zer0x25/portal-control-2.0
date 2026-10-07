import type {} from "../../../platform/fastify/types";
import type { FastifyPluginAsync, onRequestHookHandler } from "fastify";
import { PassThrough } from "node:stream";
import { z } from "zod";
import {
  EmployeeSchema,
  EmployeeQuerySchema,
  BulkEmployeeSchema,
} from "../../../models/schemas/employee.schemas";
import { validateRequest } from "../../../platform/fastify/validation";
import { ForbiddenError } from "../../../utils/AppError";
import type { ExcelHttpStream } from "../../../utils/httpStream";
import type { EmployeeFlows } from "../application/flows";
import type {
  EmployeeCreateInput,
  EmployeeUpdateInput,
  EmployeeBulkInput,
  EmployeeQuery,
} from "../application/contracts";

export interface EmployeesHttpService extends EmployeeFlows {
  exportExcel(
    stream: ExcelHttpStream,
    filters: { search?: string; status?: string; area?: string },
  ): Promise<void>;
}
export interface EmployeesPluginOptions {
  service: EmployeesHttpService;
  authenticate: onRequestHookHandler;
}
export const employeesPlugin: FastifyPluginAsync<EmployeesPluginOptions> = async (app, options) => {
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
  app.get<{ Querystring: EmployeeQuery }>("/api/employees/kiosk", async (request) =>
    options.service.list(request.query),
  );
  app.get<{ Querystring: EmployeeQuery }>(
    "/api/employees",
    { ...read, preHandler: validateRequest("query", EmployeeQuerySchema) },
    async (request) => options.service.list(request.query, request.user),
  );
  app.post<{ Body: EmployeeCreateInput }>(
    "/api/employees",
    { ...write, preHandler: validateRequest("body", EmployeeSchema) },
    async (request, reply) =>
      reply
        .code(201)
        .send(await options.service.create(request.body, request.user?.username || "SYSTEM")),
  );
  app.put<{ Params: { id: string }; Body: EmployeeUpdateInput }>(
    "/api/employees/:id",
    {
      ...write,
      preHandler: [
        validateRequest("params", z.object({ id: z.string() })),
        validateRequest("body", EmployeeSchema.partial()),
      ],
    },
    async (request) =>
      options.service.update(request.params.id, request.body, request.user?.username || "SYSTEM"),
  );
  app.post<{ Body: EmployeeBulkInput[] }>(
    "/api/employees/bulk",
    {
      ...write,
      bodyLimit: 10 * 1024 * 1024,
      preHandler: validateRequest("body", BulkEmployeeSchema),
    },
    async (request) => options.service.bulk(request.body, request.user?.username || "SYSTEM"),
  );
  app.get<{ Querystring: { search?: string; status?: string; area?: string } }>(
    "/api/employees/export",
    { ...write, preHandler: validateRequest("query", EmployeeQuerySchema) },
    async (request, reply) => {
      reply.header(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      reply.header("Content-Disposition", "attachment; filename=lista_empleados.xlsx");
      const output = new PassThrough();
      const sink = Object.assign(output, {
        get headersSent() {
          return reply.raw.headersSent;
        },
        setHeader: (name: string, value: string) => reply.header(name, value),
        status: (code: number) => ({
          json: (body: { message: string }) => {
            reply.code(code);
            output.end(JSON.stringify(body));
          },
        }),
      });
      // Object.assign copies accessors as values; preserve the live committed-header state.
      Object.defineProperty(sink, "headersSent", { get: () => reply.raw.headersSent });
      const exporting = options.service.exportExcel(sink, request.query);
      reply.send(output);
      try {
        await exporting;
      } catch (error) {
        if (!reply.raw.headersSent) {
          reply.code(500);
          if (!output.writableEnded)
            output.end(JSON.stringify({ message: "Error al exportar empleados" }));
        } else if (!output.writableEnded) output.end();
        app.log.error({ err: error }, "Employee export failed");
      }
      return reply;
    },
  );
};
