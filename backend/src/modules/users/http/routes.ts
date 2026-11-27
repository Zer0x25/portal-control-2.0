import type {} from "../../../platform/fastify/types";
import crypto from "node:crypto";
import type { FastifyPluginAsync, onRequestHookHandler } from "fastify";
import { z } from "zod";
import {
  CreateUserSchema,
  UpdateUserSchema,
  UserQuerySchema,
  UserSchema,
} from "../../../models/schemas/auth-user.schemas";
import { validateRequest } from "../../../platform/fastify/validation";
import { ForbiddenError, ValidationError } from "../../../utils/AppError";
import { resolveAccessToken } from "../../auth";
import {
  mapUserRole,
  type CreateUserDto,
  type UpdateUserDto,
  type UserFlows,
} from "../application/flows";
export interface UsersPluginOptions {
  service: UserFlows;
  authenticate: onRequestHookHandler;
}
const params = z.object({ id: z.string() });
// Validate without replacing input to preserve the public API contract.
export const usersPlugin: FastifyPluginAsync<UsersPluginOptions> = async (app, options) => {
  const manager: onRequestHookHandler = async (request) => {
    if (
      !request.user?.role ||
      !["Super_Administrador", "Administrador"].includes(request.user.role)
    )
      throw new ForbiddenError("Acceso denegado: Se requieren permisos de Super_Administrador");
  };
  const access = { config: { requiresAuth: true }, onRequest: [options.authenticate, manager] };
  const readAccess = {
    config: { requiresAuth: true },
    onRequest: [options.authenticate, manager],
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
    async (request, reply) => {
      if (
        request.user?.role === "Administrador" &&
        mapUserRole(request.body.role) === "Super_Administrador"
      ) {
        throw new ForbiddenError(
          "Acceso denegado: No tiene permisos para crear usuarios Super_Administrador",
        );
      }
      return reply
        .code(201)
        .send(
          UserSchema.parse(
            await options.service.createUser(request.body, request.user?.username || "System"),
          ),
        );
    },
  );
  app.put<{ Params: { id: string }; Body: UpdateUserDto }>(
    "/api/users/:id",
    {
      config: { requiresAuth: true },
      onRequest: [options.authenticate],
      preHandler: [validateRequest("params", params), validateRequest("body", UpdateUserSchema)],
    },
    async (request) => {
      const actorRole = request.user?.role;
      const isManager = actorRole === "Super_Administrador" || actorRole === "Administrador";
      const isSelf = request.user?.id === request.params.id;
      if (!isManager && !isSelf) {
        throw new ForbiddenError("Acceso denegado: Se requieren permisos de Super_Administrador");
      }
      if (!isManager) {
        const bodyKeys = Object.keys(request.body || {});
        const onlyPassword = bodyKeys.length > 0 && bodyKeys.every((k) => k === "password");
        if (!onlyPassword) {
          throw new ForbiddenError(
            "Acceso denegado: Un usuario estándar solo puede actualizar su propia contraseña",
          );
        }
      }
      if (
        actorRole === "Administrador" &&
        request.body.role &&
        mapUserRole(request.body.role) === "Super_Administrador"
      ) {
        throw new ForbiddenError("Acceso denegado: No puede asignar el rol Super_Administrador");
      }
      const accessToken = resolveAccessToken(request.headers.authorization);
      const currentTokenHash = accessToken
        ? crypto.createHash("sha256").update(accessToken).digest("hex")
        : undefined;
      return UserSchema.parse(
        await options.service.updateUser(
          request.params.id,
          request.body,
          request.user?.username || "System",
          { actorId: request.user?.id, actorRole, currentTokenHash },
        ),
      );
    },
  );
  // DELETE is path-only; its JSON body is ignored by contract.
  app.delete<{ Params: { id: string } }>(
    "/api/users/:id",
    { ...access, preHandler: validateRequest("params", params) },
    async (request, reply) => {
      if (request.params.id === request.user?.id) {
        throw new ValidationError("No puedes eliminar tu propia cuenta de usuario");
      }
      await options.service.deleteUser(
        request.params.id,
        request.user?.username || "System",
        request.user?.role,
      );
      return reply.code(204).send();
    },
  );
};
