import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Spec 031 T4 (AC2, AC8): guardrail de overlays de modal.
 *
 * Los overlays `fixed inset-0` en `src/features` y `src/components/ui` deben
 * provenir de CinematicModal (estándar con focus trap/Escape/aria-modal,
 * véase components/ui/CinematicModal.tsx) o figurar en la whitelist explícita,
 * gobernada por un budget monotónico decreciente:
 * - Crear un overlay nuevo NO whitelisteado falla el CI.
 * - Migrar un overlay a CinematicModal reduce el conteo y no exige tocar el
 *   budget; la entrada obsoleta debe retirarse de la whitelist (test de
 *   honestidad) para no maskingar regresiones futuras.
 * - Aumentar el BUDGET falla: solo puede decrecer (misma política que
 *   lint-budget.json).
 */

const SRC_DIR = path.resolve(__dirname, "../..");
const SCAN_ROOTS = ["features", "components/ui"] as const;

/** Primitiva sancionada: es la fuente del overlay estándar. */
const SANCTIONED_PRIMITIVE = "components/ui/CinematicModal.tsx";

/**
 * Overlays hand-rolled aún pendientes de migrar (AC2/AC8).
 * Rutas relativas a `src/`.
 */
const MODAL_OVERLAY_WHITELIST: readonly string[] = [
  // features (11)
  "features/auth/components/ChangePasswordModal.view.tsx",
  "features/auth/components/MFALoginModal.tsx",
  "features/auth/components/MFASetupModal.tsx",
  "features/governance/components/AuditLogDetailDrawer.tsx",
  "features/logbook/views/Logbook.view.tsx",
  "features/meters/components/MeterConfigPanel.tsx",
  "features/meters/views/MeterReadings.view.tsx",
  "features/supervisor-dashboard/components/AccountingClosureTab.tsx",
  "features/supervisor-dashboard/components/EmployeeCalendarModal.tsx",
  "features/supervisor-dashboard/components/ReportsTab.tsx",
  "features/worker-portal/components/CorrectionRequestModal.view.tsx",
  // components/ui (18): modales de dominio reubicables en T15 (AC8)
  "features/supervisor-dashboard/components/AttachmentViewerModal.tsx",
  "components/ui/DatePickerDialog.tsx",
  "features/configuration/components/DeveloperPanel.tsx",
  "features/governance/components/ExportLogsModal.tsx",
  "features/employee-management/components/ImportModal.tsx",
  "components/ui/InitialSyncOverlay.tsx",
  "components/ui/LoadingOverlay.tsx",
  "components/ui/LoadingSpinner.tsx",
  "features/time-control/components/RecordHistoryModal.tsx",
  "features/supervisor-dashboard/components/RejectionReasonModal.tsx",
  "features/configuration/components/SeedingOptionsModal.tsx",
  "features/configuration/components/SeedingProgressModal.tsx",
  "components/ui/SessionExpiredOverlay.tsx",
  "features/time-control/components/ShiftHandoverModal.tsx",
  "features/configuration/components/SmtpConfigModal.tsx",
  "components/ui/TimePickerDialog.tsx",
  "components/ui/UserManualModal.tsx",
];

/**
 * Budget monotónico decreciente: conteo real medido al crear el guardrail
 * (11 en features + 18 en components/ui = 29).
 */
const MODAL_OVERLAY_HANDROLLED_BUDGET = 29;

const OVERLAY_RE = /\bfixed\s+inset-0\b/;
const CINEMATIC_IMPORT_RE = /import\s+CinematicModal\s+from\s+["'][^"']+["']/;

function collectTsxFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      collectTsxFiles(fullPath, acc);
    } else if (entry.endsWith(".tsx") && !entry.includes(".spec.")) {
      acc.push(fullPath);
    }
  }
  return acc;
}

function toSrcRelative(file: string): string {
  return path.relative(SRC_DIR, file).split(path.sep).join("/");
}

const scannedFiles = SCAN_ROOTS.flatMap((root) => collectTsxFiles(path.join(SRC_DIR, root)));

const handRolledOverlays: string[] = scannedFiles
  .filter((file) => {
    const relative = toSrcRelative(file);
    if (relative === SANCTIONED_PRIMITIVE) return false;
    const source = readFileSync(file, "utf8");
    return OVERLAY_RE.test(source) && !CINEMATIC_IMPORT_RE.test(source);
  })
  .map(toSrcRelative)
  .sort();

describe("Guardrail de overlays de modal (spec 031 AC2)", () => {
  it("no existen overlays hand-rolled fuera del whitelist ni de CinematicModal", () => {
    const offenders = handRolledOverlays.filter((file) => !MODAL_OVERLAY_WHITELIST.includes(file));
    expect(
      offenders,
      "Overlays nuevos deben usar components/ui/CinematicModal.tsx; si el patrón es distinto (drawer/bloqueo), agrégalo a MODAL_OVERLAY_WHITELIST solo con presupuesto",
    ).toEqual([]);
  });

  it("el conteo de overlays hand-rolled respeta el budget monotónico", () => {
    expect(handRolledOverlays.length).toBeLessThanOrEqual(MODAL_OVERLAY_HANDROLLED_BUDGET);
  });

  it("la whitelist vive honesta: cada entrada sigue siendo hand-rolled y existe", () => {
    for (const entry of MODAL_OVERLAY_WHITELIST) {
      const fullPath = path.join(SRC_DIR, ...entry.split("/"));
      expect(existsSync(fullPath), `Whitelist obsoleta (archivo inexistente): ${entry}`).toBe(true);
      const source = readFileSync(fullPath, "utf8");
      expect(
        OVERLAY_RE.test(source) && !CINEMATIC_IMPORT_RE.test(source),
        `Whitelist obsoleta (ya migrado a CinematicModal): ${entry}. Elimina la entrada y reduce el budget.`,
      ).toBe(true);
    }
  });

  it("no hay entradas huérfanas: todo offender está whitelisteado", () => {
    const orphans = handRolledOverlays.filter((file) => !MODAL_OVERLAY_WHITELIST.includes(file));
    expect(orphans).toEqual([]);
  });
});
