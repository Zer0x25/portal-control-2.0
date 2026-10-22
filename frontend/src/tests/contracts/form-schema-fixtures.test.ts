import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { z } from "zod";

import { FORM_SCHEMA_CONTRACTS } from "../../schemas";

/**
 * Spec 036 T7 (AC2): fixtures **dorados** para las reglas del backend que
 * OpenAPI no puede expresar.
 *
 * Las `.refine()` y `.superRefine()` del backend (remitente SMTP vacio, regla
 * de correo activa sin destinatario, motivo de rechazo obligatorio, digito
 * verificador del RUT) desaparecen en el artefacto OpenAPI: el backend las
 * implementa en el codigo, no en el esquema.
 *
 * Estos fixtures son el **registro dorado** de como se comporta el backend en
 * esos casos. Si el backend cambia una de esas reglas, el fixture falla y
 * obliga a revisar el schema del frontend **y** el fixture.
 *
 * Formato de cada fixture (`cases/<contrato>.cases.json`):
 *
 * ```json
 * {
 *   "schemaId": "employeeForm",
 *   "backendContract": "Employee",
 *   "rule": "por que esta regla existe",
 *   "cases": [
 *     { "name": "caso", "input": { ... }, "expected": { "valid": true } }
 *   ]
 * }
 * ```
 */

interface FixtureCase {
  readonly name: string;
  readonly input: Record<string, unknown>;
  readonly expected: { readonly valid: boolean; readonly field?: string };
}

interface Fixture {
  readonly schemaId: string;
  readonly backendContract: string;
  readonly rule: string;
  readonly cases: readonly FixtureCase[];
}

const FRONTEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const CASES_DIR = path.resolve(FRONTEND_ROOT, "src/tests/contracts/cases");

const fixtures: Fixture[] = readdirSync(CASES_DIR)
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(readFileSync(path.join(CASES_DIR, file), "utf8")) as Fixture);

const schemaById = new Map<string, z.ZodType>(
  FORM_SCHEMA_CONTRACTS.map((contract) => [contract.id, contract.schema]),
);

describe("fixtures dorados de las reglas que OpenAPI no expresa (spec 036 AC2)", () => {
  it("hay fixtures y todos apuntan a un schema de formulario registrado", () => {
    expect(fixtures.length).toBeGreaterThan(0);

    for (const fixture of fixtures) {
      expect(
        schemaById.has(fixture.schemaId),
        `el fixture ${fixture.schemaId} no esta en el mapa de contratos`,
      ).toBe(true);
      expect(fixture.rule.length).toBeGreaterThan(0);
      expect(fixture.cases.length).toBeGreaterThan(0);
    }
  });

  it.each(
    fixtures.flatMap((fixture) =>
      fixture.cases.map((fixtureCase) => [fixture, fixtureCase] as const),
    ),
  )("$schemaId: $name", (fixture, fixtureCase) => {
    const schema = schemaById.get(fixture.schemaId);
    if (!schema) throw new Error(`schema desconocido: ${fixture.schemaId}`);

    const result = schema.safeParse(fixtureCase.input);

    expect(result.success, `esperaba ${fixtureCase.expected.valid}`).toBe(
      fixtureCase.expected.valid,
    );

    if (!result.success && fixtureCase.expected.field) {
      const paths = result.error.issues.map((issue) => issue.path.join("."));
      expect(paths, `campo esperado: ${fixtureCase.expected.field}`).toContain(
        fixtureCase.expected.field,
      );
    }
  });
});
