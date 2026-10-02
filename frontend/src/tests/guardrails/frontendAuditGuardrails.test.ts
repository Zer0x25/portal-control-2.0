import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, it, expect } from "vitest";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(currentDir, "../../..");
const eslintConfigPath = path.join(frontendRoot, "eslint.config.js");

const auditedViewFiles = [
  "src/features/governance/views/GovernanceHub.view.tsx",
  "src/features/governance/views/SecurityInsights.view.tsx",
  "src/features/governance/views/SystemMaintenance.view.tsx",
  "src/features/governance/views/BackupListModal.view.tsx",
  "src/features/configuration/views/Configuration.view.tsx",
  "src/features/configuration/views/EmailCenter.view.tsx",
  "src/features/configuration/views/MasterDataExport.view.tsx",
  "src/features/theoretical-shifts/views/TheoreticalShifts.view.tsx",
  "src/features/theoretical-shifts/views/PatternManager.view.tsx",
  "src/features/theoretical-shifts/views/LeaveManager.view.tsx",
  "src/features/theoretical-shifts/views/HolidayManager.view.tsx",
  "src/features/theoretical-shifts/views/AssignmentManager.view.tsx",
  "src/features/shift-calendar/views/ShiftCalendar.view.tsx",
  "src/features/planning/views/MonthlyPlanning.view.tsx",
  "src/features/user-management/views/UserManagement.view.tsx",
  "src/features/employee-management/views/EmployeeManagement.view.tsx",
  "src/features/meters/views/MeterReadings.view.tsx",
  "src/features/communications/views/Communications.view.tsx",
  "src/features/logbook/views/Logbook.view.tsx",
];

const lintSnippet = async (code: string, filePath: string) => {
  const eslint = new ESLint({
    cwd: frontendRoot,
    overrideConfigFile: eslintConfigPath,
  });

  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.map((message) => message.message);
};

describe("frontend audit guardrails", () => {
  it("keeps restricted temporal patterns blocked by ESLint", async () => {
    const messages = await lintSnippet(
      [
        "const businessDate = new Date('2026-03-06');",
        "const day = new Date().toISOString().split('T')[0];",
      ].join("\n"),
      "src/tests/guardrails/time-guardrail.ts",
    );

    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Evita new Date('YYYY-MM-DD')"),
        expect.stringContaining("Evita toISOString().split('T')[0]"),
      ]),
    );
  }, 30000);

  it("keeps side effects out of .view.tsx files", async () => {
    const messages = await lintSnippet(
      ["export const DemoView = () => {", "  fetch('/api/demo');", "  return null;", "};"].join(
        "\n",
      ),
      "src/features/governance/views/Demo.view.tsx",
    );

    expect(messages).toEqual(
      expect.arrayContaining([expect.stringContaining("No uses fetch en *.view.tsx")]),
    );
  });

  it("prevents ReturnType coupling in audited views", () => {
    for (const relativePath of auditedViewFiles) {
      const source = readFileSync(path.join(frontendRoot, relativePath), "utf8");
      expect(source).not.toMatch(/ReturnType\s*<\s*typeof\s+use[A-Z]\w*\s*>/);
    }
  });
});
