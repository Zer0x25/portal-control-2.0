import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { FORM_SCHEMA_CONTRACTS } from "../../schemas";
import {
  compareWithBackend,
  toOpenApiSchema,
  type OpenApiDocument,
  type OpenApiSchema,
  type SchemaMismatch,
} from "./openApiSchema";

/**
 * Spec 036 T7 (AC2): **paridad** entre los schemas de formulario del frontend
 * y los del backend.
 *
 * El backend es la autoridad. Este test falla si el schema de un formulario:
 *
 * - exige un campo que el backend admite como opcional;
 * - escribe un campo que el backend no conoce (se perderia en silencio);
 * - se salta una constraint del backend (`minLength`, `pattern`, `enum`,
 *   `minimum`/`maximum`, `format`, `nullable`);
 * - se inventa una constraint que el backend no tiene (seria mas estricto de
 *   lo que dice el contrato).
 *
 * Las divergencias **deliberadas** estan declaradas en el mapa de contratos
 * (`src/schemas/index.ts`): el test las acepta y las documenta.
 *
 * Las reglas que OpenAPI no puede expresar (los `.refine()` del backend) se
 * verifican aparte con los fixtures dorados de `cases/*.json`.
 */

const FRONTEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SWAGGER_PATH = path.resolve(FRONTEND_ROOT, "../backend/docs/swagger.json");

const swagger = JSON.parse(readFileSync(SWAGGER_PATH, "utf8")) as OpenApiDocument;

const describeMismatch = (mismatch: SchemaMismatch): string =>
  `${mismatch.path}.${mismatch.attribute}: formulario=${JSON.stringify(
    mismatch.frontend,
  )} backend=${JSON.stringify(mismatch.backend)}`;

/** Resuelve una ruta con puntos dentro de un schema OpenAPI (`profiles.items`). */
const resolveOpenApiPath = (
  schema: OpenApiSchema,
  openApiPath: string | undefined,
): OpenApiSchema => {
  if (!openApiPath) return schema;
  return openApiPath.split(".").reduce<OpenApiSchema | undefined>((current, segment) => {
    if (!current) return undefined;
    if (segment === "items") return current.items;
    return current.properties?.[segment];
  }, schema) as OpenApiSchema;
};

describe("paridad de los schemas de formulario con el backend (spec 036 AC2)", () => {
  it("el artefacto OpenAPI del backend esta disponible", () => {
    expect(Object.keys(swagger.components.schemas).length).toBeGreaterThan(0);
  });

  it.each(
    FORM_SCHEMA_CONTRACTS.filter((contract) => contract.openApi !== null).map(
      (contract) => [contract.id, contract] as const,
    ),
  )("%s coincide con el schema OpenAPI %s", (_id, contract) => {
    const backendSchema = resolveOpenApiPath(
      swagger.components.schemas[contract.openApi as string],
      contract.openApiPath,
    );
    expect(backendSchema).toBeDefined();

    const mismatches = compareWithBackend(
      toOpenApiSchema(contract.schema),
      backendSchema,
      swagger,
      {
        localFields: contract.localFields,
        openApiUndeclaredFields: contract.openApiUndeclaredFields,
        transformedFields: contract.transformedFields,
        stricterRequired: contract.stricterRequired,
      },
    );

    expect(mismatches.map(describeMismatch)).toEqual([]);
  });
});
