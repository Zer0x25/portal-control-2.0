import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * Spec 032 T6 (AC1): frontera única de colecciones remotas.
 *
 * - `src/store/slices/*` no puede importar servicios de dominio ni escribir
 *   IndexedDB, salvo la whitelist explícita de exactamente dos archivos:
 *   `syncSlice.ts` (cola offline de escritura) y `authSlice.ts` (sesión).
 * - La whitelist está **congelada**: crecerla obliga a tocar este test, y eso
 *   falla CI hasta que la regla se discuta explícitamente.
 * - Ningún hook de mutación hace doble refresh (`invalidateQueries` +
 *   recarga vía loader del store): dos fuentes para la misma colección
 *   reintroducirían la inconsistencia que eliminamos en T7.
 */

const currentDir = path.dirname(new URL(import.meta.url).pathname);
const frontendRoot = path.resolve(currentDir, "../../..");
const slicesDir = path.join(frontendRoot, "src/store/slices");
const hooksDir = path.join(frontendRoot, "src/hooks");

/** Únicos archivos con acceso a servicios/IDB. Longitud congelada en 2. */
const SERVICE_ACCESS_SLICE_WHITELIST: readonly string[] = [
  "syncSlice.ts", // cola offline de escritura (preservada bit a bit)
  "authSlice.ts", // sesión: purge del cache y wipe en cambio de usuario
];

const FROZEN_WHITELIST_LENGTH = 2;

/** `from "../../services/x"` o `from "../../utils/indexedDB"`. */
const SERVICE_OR_IDB_IMPORT = /from\s+"[^"]*(?:\/services\/[^"]*"|\/utils\/indexedDB")/;

/** Loader del store que recarga una colección (`loadShiftData()`, `loadUsers()`, ...). */
const STORE_LOADER_CALL = /\bstate\.load[A-Z][A-Za-z]*\s*\(|getState\(\)\.load[A-Z][A-Za-z]*\s*\(/;

const listSliceFiles = (): string[] =>
  readdirSync(slicesDir)
    .filter((entry) => entry.endsWith(".ts"))
    .sort();

const listMutationHookFiles = (): string[] =>
  readdirSync(hooksDir)
    .filter((entry) => /^use[A-Za-z0-9]*Mutations\d*\.ts$/.test(entry))
    .sort();

describe("Guardrail de frontera de estado (spec 032 T6, AC1)", () => {
  it("los unicos slices con servicios o IndexedDB son syncSlice y authSlice", () => {
    const offenders = listSliceFiles().filter((file) => {
      if (SERVICE_ACCESS_SLICE_WHITELIST.includes(file)) return false;
      const source = readFileSync(path.join(slicesDir, file), "utf8");
      return SERVICE_OR_IDB_IMPORT.test(source);
    });

    expect(
      offenders,
      "Los slices deben usar query hooks, no servicios de dominio/IDB: " + offenders.join(", "),
    ).toEqual([]);
  });

  it("la whitelist de la frontera esta congelada a exactamente dos archivos", () => {
    expect(SERVICE_ACCESS_SLICE_WHITELIST.length).toBe(FROZEN_WHITELIST_LENGTH);
    expect([...SERVICE_ACCESS_SLICE_WHITELIST]).toEqual(["syncSlice.ts", "authSlice.ts"]);
  });

  it("ningun hook de mutacion hace doble refresh", () => {
    const offenders = listMutationHookFiles().filter((file) => {
      const source = readFileSync(path.join(hooksDir, file), "utf8");
      const invalidates = source.includes("invalidateQueries");
      const reloadsStore = STORE_LOADER_CALL.test(source);
      return invalidates && reloadsStore;
    });

    expect(
      offenders,
      "Doble refresh (invalidateQueries + loader del store) en: " + offenders.join(", "),
    ).toEqual([]);
  });

  it("los hooks de mutacion existentes cubren al menos un invalidateQueries", () => {
    // Si un archivo de mutaciones deja de sincronizar, la API quedó huérfana.
    const files = listMutationHookFiles();
    expect(files.length).toBeGreaterThan(0);

    const orphaned = files.filter((file) => {
      const source = readFileSync(path.join(hooksDir, file), "utf8");
      const usesQueryClient = source.includes("useQueryClient");
      return usesQueryClient && !source.includes("invalidateQueries");
    });

    expect(orphaned, "Mutaciones sin invalidacion de cache: " + orphaned.join(", ")).toEqual([]);
  });

  it("el store global no expone flags de apertura de modales", () => {
    const modalOpenFlag = /\b(?:is[A-Z][A-Za-z0-9]*(?:Modal)?Open|show[A-Z][A-Za-z0-9]*Modal)\b/;
    const offenders = listSliceFiles().flatMap((file) => {
      const source = readFileSync(path.join(slicesDir, file), "utf8");
      return source
        .split("\n")
        .map((line, index) => ({ file, line: index + 1, text: line.trim() }))
        .filter(({ text }) => modalOpenFlag.test(text))
        .map(({ file: offenderFile, line, text }) => `${offenderFile}:${line}: ${text}`);
    });

    expect(
      offenders,
      "Los flags de modales deben vivir en su feature: " + offenders.join("; "),
    ).toEqual([]);
  });
});
