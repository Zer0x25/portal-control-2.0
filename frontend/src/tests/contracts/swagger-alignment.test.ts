import { describe, it, expect } from "vitest";
import swagger from "../../../../backend/docs/swagger.json";
import { handlers } from "../mocks/handlers";
import { HttpHandler } from "msw";

interface SwaggerSchema {
  type?: string;
  $ref?: string;
  required?: string[];
  properties?: Record<string, SwaggerSchema>;
  items?: SwaggerSchema;
  allOf?: SwaggerSchema[];
  oneOf?: SwaggerSchema[];
  anyOf?: SwaggerSchema[];
  nullable?: boolean;
}

function resolveRef(ref: string, root: typeof swagger): SwaggerSchema {
  if (!ref.startsWith("#/components/schemas/")) {
    throw new Error(`Unsupported ref format: ${ref}`);
  }
  const schemaName = ref.replace("#/components/schemas/", "");
  const schema = (root.components?.schemas as Record<string, SwaggerSchema>)?.[schemaName];
  if (!schema) {
    throw new Error(`Schema not found for ref: ${ref}`);
  }
  return schema;
}

function validateAgainstSchema(
  data: unknown,
  rawSchema: SwaggerSchema,
  root: typeof swagger,
): boolean {
  if (data === null || data === undefined) {
    return rawSchema.nullable === true;
  }

  let schema = rawSchema;
  if (schema.$ref) {
    schema = resolveRef(schema.$ref, root);
  }

  if (schema.allOf) {
    return schema.allOf.every((sub) => validateAgainstSchema(data, sub, root));
  }

  if (schema.oneOf) {
    return schema.oneOf.some((sub) => validateAgainstSchema(data, sub, root));
  }

  if (schema.anyOf) {
    return schema.anyOf.some((sub) => validateAgainstSchema(data, sub, root));
  }

  if (schema.type === "object" || (!schema.type && schema.properties)) {
    if (typeof data !== "object" || Array.isArray(data) || data === null) {
      return false;
    }
    const record = data as Record<string, unknown>;
    if (schema.required) {
      for (const reqKey of schema.required) {
        if (!(reqKey in record) || record[reqKey] === undefined) {
          return false;
        }
      }
    }
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in record && record[key] !== undefined) {
          if (!validateAgainstSchema(record[key], propSchema, root)) {
            return false;
          }
        }
      }
    }
    return true;
  }

  if (schema.type === "array") {
    if (!Array.isArray(data)) return false;
    if (schema.items) {
      return data.every((item) => validateAgainstSchema(item, schema.items!, root));
    }
    return true;
  }

  if (schema.type === "string") return typeof data === "string";
  if (schema.type === "number" || schema.type === "integer") return typeof data === "number";
  if (schema.type === "boolean") return typeof data === "boolean";

  return true;
}

describe("Swagger Contract Alignment (AC3)", () => {
  it("every MSW handler corresponds to an existing OpenAPI path and method", () => {
    expect(handlers.length).toBeGreaterThan(0);

    for (const handler of handlers) {
      if (!(handler instanceof HttpHandler)) continue;

      const pathPattern = handler.info.path as string;
      const normalizedPath = pathPattern.replace(/^\*/, "").replace(/:([a-zA-Z0-9_]+)/g, "{$1}");

      const method = String(handler.info.method).toLowerCase();
      const swaggerPaths = swagger.paths as Record<string, Record<string, unknown>>;
      const pathEntry = swaggerPaths[normalizedPath];

      expect(
        pathEntry,
        `Handler path "${pathPattern}" (normalized as "${normalizedPath}") not found in swagger.json`,
      ).toBeDefined();

      expect(
        pathEntry[method],
        `Handler method "${method.toUpperCase()}" for "${normalizedPath}" not found in swagger.json`,
      ).toBeDefined();
    }
  });

  it("every MSW handler returns a response conforming to the OpenAPI schema", async () => {
    for (const handler of handlers) {
      if (!(handler instanceof HttpHandler)) continue;

      const pathPattern = handler.info.path as string;
      const normalizedPath = pathPattern.replace(/^\*/, "").replace(/:([a-zA-Z0-9_]+)/g, "{$1}");

      const method = String(handler.info.method).toLowerCase();
      const swaggerPaths = swagger.paths as unknown as Record<
        string,
        Record<
          string,
          {
            responses: Record<
              string,
              { content?: { "application/json"?: { schema?: SwaggerSchema } } }
            >;
          }
        >
      >;

      const operation = swaggerPaths[normalizedPath][method];
      expect(operation).toBeDefined();

      // Create a test request simulating the endpoint
      const simulatedUrl = `http://localhost:4000${normalizedPath.replace(/{[^}]+}/g, "test-id")}`;
      const request = new Request(simulatedUrl, {
        method: String(handler.info.method),
        headers: { "Content-Type": "application/json" },
      });

      const execution = await handler.run({ request, requestId: "contract-test-id" });
      expect(
        execution.response,
        `Handler for ${method.toUpperCase()} ${normalizedPath} did not produce a response`,
      ).toBeDefined();

      const response = execution.response!;
      const statusCode = String(response.status);

      expect(
        operation.responses[statusCode],
        `Response status ${statusCode} not declared in swagger.json for ${method.toUpperCase()} ${normalizedPath}`,
      ).toBeDefined();

      const expectedSchema = operation.responses[statusCode]?.content?.["application/json"]?.schema;

      if (expectedSchema) {
        const body = await response.clone().json();
        const isValid = validateAgainstSchema(body, expectedSchema, swagger);
        expect(
          isValid,
          `Handler response body for ${method.toUpperCase()} ${normalizedPath} does not match OpenAPI schema: ${JSON.stringify(body)}`,
        ).toBe(true);
      }
    }
  });
});
