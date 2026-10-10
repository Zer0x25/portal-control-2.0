import type {} from "../../../platform/fastify/types";
import type { FastifyPluginAsync, onRequestHookHandler } from "fastify";
import { z } from "zod";
import {
  CreateUserSchema,
  UpdateUserSchema,
  UserQuerySchema,
  UserSchema,
} from "../../../models/schemas/auth-user.schemas";
import { validateRequest } from "../../../platform/fastify/validation";
import { ForbiddenError } from "../../../utils/AppError";
import type { CreateUserDto, UpdateUserDto, UserFlows } from "../application/flows";
export interface UsersPluginOptions {
  service: UserFlows;
  authenticate: onRequestHookHandler;
}
const params = z.object({ id: z.string() });
// Validate without replacing input to preserve the public API contract.
export const usersPlugin: FastifyPluginAsync<UsersPluginOptions> = async (app, options) => {
  const admin: onRequestHookHandler = async (request) => {
    if (request.user?.role !== "Administrador")
      throw new ForbiddenError("Acceso denegado: Se requieren permisos de Administrador");
  };
  // La página de gestión es legible por Supervisor_Elevado (solo lectura en
  // frontend vía canManageUser); las escrituras siguen siendo admin-only.
  const reader: onRequestHookHandler = async (request) => {
    if (!request.user?.role || !["Administrador", "Supervisor_Elevado"].includes(request.user.role))
      throw new ForbiddenError("Acceso denegado: Se requieren permisos de Administrador");
  };
  const access = { config: { requiresAuth: true }, onRequest: [options.authenticate, admin] };
  const readAccess = {
    config: { requiresAuth: true },
    onRequest: [options.authenticate, reader],
  };
  app.get<{ Querystring: z.input<typeof UserQuerySchema> }>(
    "/api/users",
    { ...readAccess, preHandler: validateRequest("query", UserQuerySchema) },
    async (request) => {
      const query = request.query;
      const result = await options.service.getAllUsers({
        ...query,
        page: query.page ? Number(query.page) : undefined,
        pageSize: query.pageSize ? Number(query.pageSize) : undefined,
        requesterRole: request.user?.role,
        requesterId: request.user?.id,
      });
      const users = result.users.map((user) => UserSchema.parse(user));
      return result.isPaginated
        ? {
            data: users,
            pagination: {
              total: result.total,
              page: Number(query.page),
              totalPages: Math.ceil(result.total / Number(query.pageSize)),
            },
          }
        : users;
    },
  );
  app.post<{ Body: CreateUserDto }>(
    "/api/users",
    { ...access, preHandler: validateRequest("body", CreateUserSchema) },
    async (request, reply) =>
      reply
        .code(201)
        .send(
          UserSchema.parse(
            await options.service.createUser(request.body, request.user?.username || "System"),
          ),
        ),
  );
  app.put<{ Params: { id: string }; Body: UpdateUserDto }>(
    "/api/users/:id",
    {
      ...access,
      preHandler: [validateRequest("params", params), validateRequest("body", UpdateUserSchema)],
    },
    async (request) =>
      UserSchema.parse(
        await options.service.updateUser(
          request.params.id,
          request.body,
          request.user?.username || "System",
        ),
      ),
  );
  // DELETE is path-only; its JSON body is ignored by contract.
  app.delete<{ Params: { id: string } }>(
    "/api/users/:id",
    { ...access, preHandler: validateRequest("params", params) },
    async (request, reply) => {
      await options.service.deleteUser(request.params.id, request.user?.username || "System");
      return reply.code(204).send();
    },
  );
};
