import type { preHandlerHookHandler } from "fastify";
import type { ZodType } from "zod";

const validators = new WeakSet<object>();
export function validateRequest(
  field: "body" | "query" | "params",
  schema: ZodType,
): preHandlerHookHandler {
  const hook: preHandlerHookHandler = async (request) => {
    await schema.parseAsync(request[field]);
  };
  validators.add(hook);
  return hook;
}
export function isRequestValidator(hook: unknown): boolean {
  return typeof hook === "function" && validators.has(hook);
}
