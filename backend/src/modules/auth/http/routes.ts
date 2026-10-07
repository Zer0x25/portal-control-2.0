import type {} from "../../../platform/fastify/types";
import type { FastifyPluginAsync, FastifyRequest, onRequestHookHandler } from "fastify";
import { z } from "zod";
import {
  LoginSchema,
  KioskLoginSchema,
  MFAVerifySchema,
  MFAValidateSchema,
} from "../../../models/schemas/auth-user.schemas";
import { validateRequest } from "../../../platform/fastify/validation";
import {
  loginResponse,
  sessionResponse,
  kioskResponse,
  messageResponse,
  setupResponse,
} from "./responseSchemas";
import type { AuthFlows } from "../application/flows";

export interface AuthPluginOptions {
  flows: AuthFlows;
  authenticate: onRequestHookHandler;
  inspectFailures(
    ip: string,
    body: unknown,
  ): Promise<{ retryAfter: number; message: string } | null>;
}
// Both endpoints historically accept an absent body or any JSON payload and ignore it.
const ignoredBody = z.unknown();
const context = (request: FastifyRequest) => ({
  ip: request.ip,
  userAgent: request.headers["user-agent"],
  user: request.user,
});
export const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (app, options) => {
  const throttle = async (request: FastifyRequest, reply: Parameters<onRequestHookHandler>[1]) => {
    const blocked = await options.inspectFailures(request.ip || "unknown", request.body);
    if (blocked)
      return reply
        .header("Retry-After", String(blocked.retryAfter))
        .code(429)
        .send({ message: blocked.message });
  };
  app.post<{ Body: z.infer<typeof LoginSchema> }>(
    "/api/auth/login",
    {
      schema: { response: { 200: loginResponse } },
      preHandler: [throttle, validateRequest("body", LoginSchema)],
    },
    async (request, reply) => {
      const result = await options.flows.login(request.body, context(request));
      return reply.code(result.status).send(result.body);
    },
  );
  app.post<{ Body: z.infer<typeof KioskLoginSchema> }>(
    "/api/auth/kiosk-login",
    {
      schema: { response: { 200: kioskResponse } },
      preHandler: [throttle, validateRequest("body", KioskLoginSchema)],
    },
    async (request, reply) => {
      const result = await options.flows.kioskLogin(request.body, context(request));
      return reply.code(result.status).send(result.body);
    },
  );
  app.post(
    "/api/auth/logout",
    {
      schema: { response: { 200: messageResponse } },
      preHandler: validateRequest("body", ignoredBody),
    },
    async (request, reply) => {
      const result = await options.flows.logout(
        request.headers.authorization?.split(" ")[1],
        context(request),
      );
      return reply.code(result.status).send(result.body);
    },
  );
  app.post(
    "/api/auth/mfa/setup",
    {
      config: { requiresAuth: true },
      onRequest: options.authenticate,
      schema: { response: { 200: setupResponse } },
      preHandler: validateRequest("body", ignoredBody),
    },
    async (request, reply) => {
      const result = await options.flows.setupMFA(context(request));
      return reply.code(result.status).send(result.body);
    },
  );
  app.post<{ Body: z.infer<typeof MFAVerifySchema> }>(
    "/api/auth/mfa/verify",
    {
      config: { requiresAuth: true },
      onRequest: options.authenticate,
      schema: { response: { 200: messageResponse } },
      preHandler: validateRequest("body", MFAVerifySchema),
    },
    async (request, reply) => {
      const result = await options.flows.verifyMFASetup(request.body, context(request));
      return reply.code(result.status).send(result.body);
    },
  );
  app.post<{ Body: z.infer<typeof MFAValidateSchema> }>(
    "/api/auth/mfa/validate",
    {
      schema: { response: { 200: sessionResponse } },
      preHandler: validateRequest("body", MFAValidateSchema),
    },
    async (request, reply) => {
      const result = await options.flows.validateMFA(request.body, context(request));
      return reply.code(result.status).send(result.body);
    },
  );
};
