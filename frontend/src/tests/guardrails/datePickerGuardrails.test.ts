import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Spec 031 T11 (AC7): un unico date picker en el design system.
 *
 * - La grilla de calendario vive solo en `components/ui/DatePicker.tsx`.
 * - `DatePickerDialog` (modal) reutiliza esa grilla; no reimplementa el calendario.
 * - `GlassDatePicker` queda eliminado (era un segundo date picker).
 * - Los inputs nativos `type="date"` quedan permitidos solo en los filtros
 *   listados abajo: son accesibles por defecto y no arrastran el desfase de
 *   zona horaria de los `new Date("YYYY-MM-DD")`. La evaluacion de migrarlos
 *   al picker componible queda registrada en el ADR-0022.
 */

const currentDir = path.dirname(new URL(import.meta.url).pathname);
const frontendRoot = path.resolve(currentDir, "../../..");
const srcDir = path.join(frontendRoot, "src");

function getFilesRecursively(dir: string, extensions: string[]): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      results.push(...getFilesRecursively(fullPath, extensions));
    } else if (extensions.some((ext) => entry.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

/** Filtros que mantienen inputs nativos de fecha (accesibles y sin TZ shift). */
const NATIVE_DATE_INPUT_ALLOWLIST = [
  "src/features/governance/components/AuditLogFilterPanel.tsx",
  "src/features/time-control/components/TimeRecordFilters.tsx",
  "src/features/supervisor-dashboard/components/KpiFilterPanel.tsx",
  "src/features/supervisor-dashboard/components/ReportFilterPanel.tsx",
];

describe("Guardrail de date picker unico (spec 031 AC7)", () => {
  it("no existe un segundo date picker (GlassDatePicker eliminado)", () => {
    expect(
      existsSync(path.join(srcDir, "components/ui/GlassDatePicker.tsx")),
      "GlassDatePicker debe eliminarse: la unica grilla vive en DatePicker.tsx",
    ).toBe(false);
  });

  it("solo DatePicker.tsx implementa la grilla de calendario", () => {
    const files = getFilesRecursively(srcDir, [".tsx"]).filter(
      (file) => !file.includes(".spec.") && !file.includes(".test."),
    );
    const implementations = files.filter((file) => {
      const content = readFileSync(file, "utf8");
      // Una implementacion de date picker construye el calendario mensual
      // (startOfWeek + startOfMonth) o declara la grilla como "Calendario".
      // Los graficos usan eachDayOfInterval para armar rangos, no calendarios.
      return (
        content.includes('aria-label="Calendario"') ||
        (content.includes("startOfWeek") && content.includes("startOfMonth"))
      );
    });

    expect(implementations.map((file) => path.relative(frontendRoot, file))).toEqual([
      "src/components/ui/DatePicker.tsx",
    ]);
  });

  it("DatePickerDialog reutiliza la grilla compartida", () => {
    const dialog = readFileSync(path.join(srcDir, "components/ui/DatePickerDialog.tsx"), "utf8");
    expect(dialog).toContain("DatePickerCalendar");
    expect(dialog).not.toContain("eachDayOfInterval");
  });

  it("los inputs nativos de fecha solo existen en los filtros documentados", () => {
    const files = getFilesRecursively(srcDir, [".tsx"]).filter(
      (file) => !file.includes(".spec.") && !file.includes(".test."),
    );
    const offenders = files
      .filter((file) => readFileSync(file, "utf8").includes('type="date"'))
      .map((file) => path.relative(frontendRoot, file).split(path.sep).join("/"))
      .filter((file) => !NATIVE_DATE_INPUT_ALLOWLIST.includes(file));

    expect(
      offenders,
      `Inputs nativos de fecha fuera de los filtros permitidos. Usa components/ui/DatePicker.\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
