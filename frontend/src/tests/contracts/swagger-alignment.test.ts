import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv, { type ErrorObject } from "ajv";
import { HttpHandler } from "msw";
import { describe, expect, it } from "vitest";

import { routeContracts, type MockRouteContract } from "../mocks/handlers";
import { server } from "../mocks/server";

/**
 * Contrato entre los handlers MSW y el backend (spec 035, T2, AC3).
 *
 * Los handlers de MSW son el **unico** punto donde el frontend se inventa una
 * respuesta. Si esa respuesta no coincide con el contrato real, el test pasa
 * en verde y el fallo aparece en staging: este test lo detecta antes.
 *
 * Dos invariantes:
 * - (a) **Toda** ruta registrada en los handlers existe en
 *   `backend/docs/swagger.json` con el mismo verbo (una ruta inventada o un
 *   verbo equivocado es un bug, no un mock).
 * - (b) El **body** de ejemplo de cada handler cumple el schema OpenAPI de
 *   la peticion y de la respuesta (un fixture desincronizado del backend es
 *   un bug).
 *
 * La lectura del swagger es **estructural** (JSON), no una copia: el test
 * falla si el backend cambia el contrato y los mocks no se actualizan.
 */

const FRONTEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const REPO_ROOT = path.resolve(FRONTEND_ROOT, "..");
const SWAGGER_PATH = path.join(REPO_ROOT, "backend", "docs", "swagger.json");

interface SwaggerOperation {
  requestBody?: {
    content?: Record<string, { schema?: unknown }>;
  };
  responses?: Record<string, { content?: Record<string, { schema?: unknown }> }>;
}

interface SwaggerDocument {
  paths: Record<string, Record<string, SwaggerOperation | undefined>>;
  [key: string]: unknown;
}

const swagger = JSON.parse(readFileSync(SWAGGER_PATH, "utf8")) as SwaggerDocument;

/**
 * Convierte la extension OpenAPI 3.0 `nullable: true` en el unico de tipo
 * que JSON Schema (draft-07) entiende: `type: ["string", "null"]`.
 *
 * Sin esta conversion, Ajv rechaza el schema ("nullable cannot be used
 * without type") y el contrato no se podria verificar.
 */
const toJsonSchema = (node: unknown): unknown => {
  if (Array.isArray(node)) return node.map(toJsonSchema);
  if (!node || typeof node !== "object") return node;

  const source = node as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) result[key] = toJsonSchema(value);

  if (result.nullable === true) {
    delete result.nullable;
    const type = result.type;
    if (typeof type === "string") result.type = [type, "null"];
    // Sin `type` declarado, `nullable` no restringe nada: null ya es valido.
  }

  return result;
};

/** Swagger normalizado (raiz de Ajv: los `$ref` se resuelven contra el). */
const swaggerSchema = toJsonSchema(swagger) as SwaggerDocument;

/**
 * Ajv con el swagger como **raiz**: los `$ref` del tipo `#/components/schemas/X`
 * se resuelven contra el documento completo, igual que en el backend.
 */
const ajv = new Ajv({ strict: false, allErrors: true });

/** Compila un schema (inline o por `$ref`) en el contexto del swagger. */
const compileSchema = (
  schema: unknown,
): ((data: unknown) => boolean) & {
  errors?: ErrorObject[] | null;
} => {
  const root = {
    ...(swaggerSchema as Record<string, unknown>),
    ...(toJsonSchema(schema) as Record<string, unknown>),
  };
  return ajv.compile(root) as ((data: unknown) => boolean) & { errors?: ErrorObject[] | null };
};

/** Rutas realmente registradas en el server MSW (no en el contrato declarado). */
const registeredRoutes = (): Array<{ method: string; path: string }> =>
  server
    .listHandlers()
    .filter((handler): handler is HttpHandler => handler instanceof HttpHandler)
    .flatMap((handler) => {
      const { path, method } = handler.info;
      // Los handlers de este repo usan siempre path y metodo literales.
      if (typeof path !== "string" || typeof method !== "string") return [];
      const url = new URL(path);
      return [
        {
          method: method.toUpperCase(),
          // Sintaxis MSW `:id` -> sintaxis OpenAPI `{id}`.
          path: url.pathname.replace(/:(\w+)/g, "{$1}"),
        },
      ];
    });

const operationOf = (route: MockRouteContract): SwaggerOperation | undefined => {
  const item = swagger.paths[route.path];
  if (!item) return undefined;
  return item[route.method.toLowerCase()];
};

/** Schema de la peticion (`application/json`) de la operacion. */
const requestSchemaOf = (operation: SwaggerOperation | undefined): unknown =>
  operation?.requestBody?.content?.["application/json"]?.schema;

/** Schema de la respuesta 2xx (`application/json`) de la operacion. */
const responseSchemaOf = (operation: SwaggerOperation | undefined): unknown => {
  const responses = operation?.responses ?? {};
  const success = Object.entries(responses).find(([code]) => /^2\d\d$/.test(code));
  return success?.[1]?.content?.["application/json"]?.schema;
};

const formatErrors = (errors: ErrorObject[] | null | undefined): string =>
  (errors ?? [])
    .map((error) => `${error.instancePath || "/"} ${error.message ?? ""}`.trim())
    .join("; ");

describe("Contrato MSW <-> swagger del backend (spec 035, T2)", () => {
  it("(a) toda ruta registrada en los handlers existe en el swagger", () => {
    const offenders = registeredRoutes()
      .filter((route) => {
        const item = swagger.paths[route.path];
        if (!item) return true;
        return !item[route.method.toLowerCase()];
      })
      .map((route) => `${route.method} ${route.path}`);

    expect(
      offenders,
      "Rutas mockeadas que no existen en backend/docs/swagger.json: " + offenders.join(", "),
    ).toEqual([]);
  });

  it("(a) el contrato declarado cubre exactamente las rutas registradas", () => {
    const registered = registeredRoutes()
      .map((route) => `${route.method} ${route.path}`)
      .sort();
    const declared = routeContracts.map((route) => `${route.method} ${route.path}`).sort();

    expect(
      declared,
      "El contrato declarado y los handlers registrados se han desincronizado.",
    ).toEqual(registered);
  });

  it("(b) el body de peticion de cada handler cumple el schema OpenAPI", () => {
    const offenders: string[] = [];

    for (const route of routeContracts) {
      if (route.requestBody === undefined) continue;
      const schema = requestSchemaOf(operationOf(route));
      if (schema === undefined) continue;

      const validate = compileSchema(schema);
      if (!validate(route.requestBody)) {
        offenders.push(`${route.method} ${route.path}: ${formatErrors(validate.errors)}`);
      }
    }

    expect(
      offenders,
      "Cuerpos de peticion que no cumplen el schema OpenAPI: " + offenders.join(" | "),
    ).toEqual([]);
  });

  it("(b) el body de respuesta de cada handler cumple el schema OpenAPI", () => {
    const offenders: string[] = [];

    for (const route of routeContracts) {
      if (route.responseBody === undefined) continue;
      const schema = responseSchemaOf(operationOf(route));
      // Una respuesta sin schema (p. ej. 204 o "Bitacora guardada") no se
      // puede validar: no es un fallo del mock.
      if (schema === undefined) continue;

      const validate = compileSchema(schema);
      if (!validate(route.responseBody)) {
        offenders.push(`${route.method} ${route.path}: ${formatErrors(validate.errors)}`);
      }
    }

    expect(
      offenders,
      "Cuerpos de respuesta que no cumplen el schema OpenAPI: " + offenders.join(" | "),
    ).toEqual([]);
  });
});
