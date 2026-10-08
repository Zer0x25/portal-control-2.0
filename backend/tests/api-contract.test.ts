import { describe, it, expect } from "vitest";
import { swaggerSpec } from "../src/utils/openapi";

/**
 * Paths that are intentionally absent from the public contract.
 * Health checks are infrastructure and the Swagger UI is served outside `/api`.
 */

/**
 * Normaliza el spec para que el snapshot sea reproducible entre maquinas.
 *
 * `swagger-jsdoc` arma el spec en el orden en que el glob
 * `./src/platform/openapi/*.ts` encuentra los archivos, que es el orden de
 * lectura del filesystem (por inode) y no el alfabetico. Ese orden varia
 * entre maquinas: en el runner de GitHub los tags salian como
 * Exports, Holidays, Shifts, Users y en el host como Users, Shifts,
 * Holidays, Exports. Como el snapshot se guardo con el orden de una sola
 * de esas maquinas, `Coverage Ratchet` fallaba de forma intermitente sin
 * que nadie hubiera tocado el contrato.
 *
 * Se normaliza SOLO lo que no tiene orden semantico:
 *   - las claves de cada objeto (el snapshot es un objeto, no una lista);
 *   - `tags`, `servers` y `security`, que son conjuntos sin orden.
 *
 * `paths` NO se reordena: es el diccionario del contrato y sus claves ya
 * son estables. Tampoco se reordena el contenido de ningun array salvo el de
 * `tags`/`servers`/`security`, de modo que un parametro reordenado o una
 * ruta eliminada siguen fallando el snapshot.
 */
function canonicalize(spec: unknown): unknown {
  if (Array.isArray(spec)) return spec.map(canonicalize);
  if (spec === null || typeof spec !== "object") return spec;

  const source = spec as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(source).sort()) {
    const value = source[key];

    if (UNORDERED_TOP_LEVEL_KEYS.has(key)) {
      // Conjunto sin orden: se ordena por su clave identificadora para
      // que el resultado no dependa del orden de escaneo de archivos.
      const asArray = Array.isArray(value)
        ? value
        : Object.values(value as Record<string, unknown>);
      result[key] = asArray
        .map((item) => canonicalize(item))
        .sort((a, b) => identify(a).localeCompare(identify(b)));
      continue;
    }

    result[key] = canonicalize(value);
  }

  return result;
}

const UNORDERED_TOP_LEVEL_KEYS = new Set(["tags", "servers", "security"]);

/** Clave estable para comparar entradas de una coleccion sin orden. */
function identify(item: unknown): string {
  if (item === null || typeof item !== "object") return JSON.stringify(item);
  const record = item as Record<string, unknown>;
  const candidate = record.name ?? record.url ?? record.$ref ?? record.scheme;
  return typeof candidate === "string" ? candidate : JSON.stringify(record);
}

describe("API Contract", () => {
  it("Swagger specification should match the saved snapshot", () => {
    expect(canonicalize(swaggerSpec)).toMatchSnapshot();
  });

  it("Swagger components should be correctly registered", () => {
    expect(swaggerSpec).toBeDefined();
    expect(swaggerSpec.openapi).toBe("3.0.0");

    const hasComponents = !!(swaggerSpec.components || swaggerSpec.definitions);
    expect(hasComponents, "Swagger components or definitions should be defined").toBe(true);
  });
});
