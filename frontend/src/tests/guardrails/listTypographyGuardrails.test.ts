import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface ListTypographyMember {
  path: string;
  listGroup?: string;
  requiredUtilities: string[];
}

interface ListTypographyGroup {
  id: string;
  description: string;
  variants?: string[];
  members: ListTypographyMember[];
}

interface ListTypographyManifest {
  version: number;
  groups: ListTypographyGroup[];
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(currentDir, "../../..");
const manifestPath = path.join(currentDir, "list-typography-groups.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as ListTypographyManifest;
const expectedGroupIds = [
  "data-table",
  "virtualized-table",
  "responsive-record-cards",
  "activity-queue",
];
const listUtilities = [
  "typo-list-header",
  "typo-list-primary",
  "typo-list-secondary",
  "typo-list-value",
  "typo-list-note",
  "typo-list-status",
];

describe("Estándar de tipografía para listas (spec 084)", () => {
  it("mantiene registrados los cuatro grupos de presentación", () => {
    expect(manifest.version).toBe(1);
    expect(manifest.groups.map((group) => group.id)).toEqual(expectedGroupIds);
    for (const group of manifest.groups) {
      expect(group.description.trim()).not.toBe("");
      expect(group.members.length, `${group.id} debe incluir componentes`).toBeGreaterThan(0);
    }
  });

  it("valida que cada componente del inventario use sus roles y no aplique cursiva", () => {
    const missing: string[] = [];
    const italicRows: string[] = [];

    for (const group of manifest.groups) {
      for (const member of group.members) {
        const fullPath = path.join(frontendRoot, member.path);
        if (!existsSync(fullPath)) {
          missing.push(member.path);
          continue;
        }

        const source = readFileSync(fullPath, "utf8");
        const groupId = member.listGroup ?? group.id;
        expect(source, `${member.path} debe declarar data-list-group="${groupId}"`).toContain(
          `data-list-group="${groupId}"`,
        );

        for (const utility of member.requiredUtilities) {
          expect(source, `${member.path} debe usar ${utility}`).toContain(utility);
        }

        if (/\bitalic\b/.test(source)) italicRows.push(member.path);
      }
    }

    expect(missing, `Componentes del inventario inexistentes:\n${missing.join("\n")}`).toEqual([]);
    expect(italicRows, `Listas con cursiva decorativa:\n${italicRows.join("\n")}`).toEqual([]);
  });

  it("mantiene las definiciones de tamaño, familia y jerarquía canónicas", () => {
    const indexCss = readFileSync(path.join(frontendRoot, "src/index.css"), "utf8");
    const expectedRules: Record<string, string> = {
      "typo-list-header":
        "text-[12px] leading-tight font-sans font-semibold tracking-wide uppercase",
      "typo-list-primary": "text-[14px] leading-snug font-sans font-semibold",
      "typo-list-secondary": "text-[12px] leading-snug font-sans font-medium",
      "typo-list-value":
        "text-[14px] leading-snug font-mono font-semibold tabular-nums tracking-normal",
      "typo-list-note": "text-[14px] leading-relaxed font-sans font-normal",
      "typo-list-status": "text-[12px] leading-tight font-sans font-semibold",
    };

    expect(listUtilities).toEqual(Object.keys(expectedRules));
    for (const [utility, rule] of Object.entries(expectedRules)) {
      expect(indexCss, `Falta @utility ${utility}`).toContain(`@utility ${utility}`);
      expect(indexCss, `${utility} debe conservar su escala: ${rule}`).toContain(`@apply ${rule};`);
    }
  });
});
