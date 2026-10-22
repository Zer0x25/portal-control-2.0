import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Spec 031 T15 (AC8): `src/components/ui/` contiene solo primitivas
 * transversales, metas y utilidades shell.
 *
 * - Ningun modal de dominio vive en `components/ui/`: los modales de feature
 *   estan en `features/<dominio>/components/`.
 * - Las primitivas no dependen de features (no hay inversion de capas).
 * - Las utilidades de shell (overlays de sesion/sincronizacion, ayuda,
 *   loader) siguen en `components/ui/` porque las monta el shell.
 */

const currentDir = path.dirname(new URL(import.meta.url).pathname);
const frontendRoot = path.resolve(currentDir, "../../..");
const uiDir = path.join(frontendRoot, "src/components/ui");

/**
 * Modales transversales que si viven en components/ui.
 * AboutModal y UserManualModal son modales de meta/ayuda del shell (los
 * monta el Sidebar y el Header), no modales de dominio.
 */
const ALLOWED_UI_MODALS = [
  "CinematicModal.tsx",
  "ConfirmationModal.tsx",
  "DatePickerDialog.tsx",
  "DesignSystemShowcaseModal.tsx",
  "AboutModal.tsx",
  "UserManualModal.tsx",
];

function listUiFiles(): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(uiDir)) {
    const fullPath = path.join(uiDir, entry);
    if (statSync(fullPath).isDirectory()) {
      if (entry === "icons") continue;
      results.push(...listUiFiles());
      continue;
    }
    if (entry.endsWith(".tsx") || entry.endsWith(".ts")) {
      if (entry.includes(".spec.")) continue;
      results.push(entry);
    }
  }
  return results;
}

describe("Guardrail de la capa UI (spec 031 AC8)", () => {
  it("components/ui no contiene modales de dominio", () => {
    const modals = listUiFiles().filter((file) => file.endsWith("Modal.tsx"));
    const offenders = modals.filter((file) => !ALLOWED_UI_MODALS.includes(file));
    expect(
      offenders,
      `Los modales de dominio deben vivir en features/<dominio>/components/: ${offenders.join(", ")}`,
    ).toEqual([]);
  });

  it("las primitivas de components/ui no importan desde features", () => {
    const offenders: string[] = [];
    for (const file of listUiFiles()) {
      const content = readFileSync(path.join(uiDir, file), "utf8");
      if (/from\s+"\.\.\/(?:\.\.\/)?features\//.test(content)) {
        offenders.push(file);
      }
    }
    expect(
      offenders,
      `Inversion de capas: las primitivas no deben depender de features: ${offenders.join(", ")}`,
    ).toEqual([]);
  });

  it("los modales de dominio viven en su feature", () => {
    const expected: Record<string, string> = {
      "AddNoveltyModal.container.tsx":
        "src/features/logbook/components/AddNoveltyModal.container.tsx",
      "AddSupplierModal.container.tsx":
        "src/features/logbook/components/AddSupplierModal.container.tsx",
      "AnomalyResolutionModal.tsx":
        "src/features/time-control/components/AnomalyResolutionModal.tsx",
      "AttachmentViewerModal.tsx":
        "src/features/supervisor-dashboard/components/AttachmentViewerModal.tsx",
      "ClosedReportsModal.tsx": "src/features/logbook/components/ClosedReportsModal.tsx",
      "ExportLogsModal.tsx": "src/features/governance/components/ExportLogsModal.tsx",
      "ImportModal.tsx": "src/features/employee-management/components/ImportModal.tsx",
      "RecordHistoryModal.tsx": "src/features/time-control/components/RecordHistoryModal.tsx",
      "RejectionReasonModal.container.tsx":
        "src/features/supervisor-dashboard/components/RejectionReasonModal.container.tsx",
      "SeedingOptionsModal.container.tsx":
        "src/features/configuration/components/SeedingOptionsModal.container.tsx",
      "SeedingProgressModal.tsx": "src/features/configuration/components/SeedingProgressModal.tsx",
      "ShiftHandoverModal.tsx": "src/features/time-control/components/ShiftHandoverModal.tsx",
      "ShiftHistoryModal.tsx": "src/features/employee-management/components/ShiftHistoryModal.tsx",
      "ShiftReportModal.tsx": "src/features/logbook/components/ShiftReportModal.tsx",
      "SmtpConfigModal.container.tsx":
        "src/features/configuration/components/SmtpConfigModal.container.tsx",
    };

    for (const [file, relPath] of Object.entries(expected)) {
      const exists = readdirSync(path.join(frontendRoot, path.dirname(relPath))).includes(file);
      expect(exists, `${file} debe vivir en ${relPath}`).toBe(true);
    }
  });
});
