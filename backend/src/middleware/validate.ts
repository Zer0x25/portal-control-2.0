import { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodTypeAny } from "zod";

interface ValidationSchema {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Distinguishes the two accepted `validate` argument shapes: a bare Zod schema
 * (simple, body only) versus a `{ body, query, params }` container. Checking
 * for the container's own keys keeps this type-safe without casting.
 */
const isValidationSchema = (schema: ZodTypeAny | ValidationSchema): schema is ValidationSchema =>
  "body" in schema || "query" in schema || "params" in schema;

/** Marker read by the architecture guard to detect `validate` middleware. */
export const VALIDATE_MARKER = "__isValidateMiddleware";

type ValidateMiddleware = RequestHandler & { [VALIDATE_MARKER]?: true };

export const validate = (schema: ZodTypeAny | ValidationSchema): ValidateMiddleware => {
  const middleware: ValidateMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (isValidationSchema(schema)) {
        // Complex usage: validate body, query, and/or params
        if (schema.body) await schema.body.parseAsync(req.body);
        if (schema.query) await schema.query.parseAsync(req.query);
        if (schema.params) await schema.params.parseAsync(req.params);
      } else {
        // Simple usage: validate only body
        await schema.parseAsync(req.body);
      }
      return next();
    } catch (error) {
      // Pass to global error handler to ensure auditing and consistent formatting
      return next(error);
    }
  };

  // The factory returns anonymous arrow functions, so `fn.name` cannot be
  // relied on for route introspection. Tag every instance explicitly.
  Object.defineProperty(middleware, VALIDATE_MARKER, {
    value: true,
    enumerable: false,
    configurable: false,
  });

  return middleware;
};

/** True when `candidate` is a `validate(...)` middleware instance. */
export const isValidateMiddleware = (candidate: unknown): boolean =>
  typeof candidate === "function" && (candidate as ValidateMiddleware)[VALIDATE_MARKER] === true;
