import type { AuthUser } from "../../modules/auth";

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
  interface FastifyContextConfig {
    requiresAuth?: boolean;
    roles?: readonly string[];
  }
}
