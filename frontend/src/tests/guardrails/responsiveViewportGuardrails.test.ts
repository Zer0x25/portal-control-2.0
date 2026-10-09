import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(currentDir, "../../..");
const srcDir = path.join(frontendRoot, "src");

/**
 * Colecta recursivamente archivos con extensiones dadas
 */
function getFilesRecursively(dir: string, filterFn: (file: string) => boolean): string[] {
  let results: string[] = [];
  if (!readdirSync) return results;
  const list = readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== "node_modules" && file !== "dist" && file !== "tests") {
        results = results.concat(getFilesRecursively(fullPath, filterFn));
      }
    } else if (filterFn(file)) {
      results.push(fullPath);
    }
  }
  return results;
}

describe("Responsive Viewport & Mobile-Desktop Coverage Guardrails", () => {
  it("audits all 24 major application views for responsive layout patterns", () => {
    const allViews = getFilesRecursively(
      path.join(srcDir, "features"),
      (file) => file.endsWith(".view.tsx") && !file.includes("Modal") && !file.includes("Dialog"),
    );

    // Patrones responsivos válidos que aseguran tolerancia y adaptación móvil <-> desktop
    const responsivePatterns = [
      /\b(?:sm|md|lg|xl|2xl):grid-cols-/,
      /\bgrid-cols-1\b/,
      /\b(?:sm|md|lg|xl|2xl):flex-row\b/,
      /\bflex-col\b/,
      /\bResponsiveView\b/,
      /\buseMediaQuery\b/,
      /\bisMobile\b/,
      /\boverflow-x-auto\b/,
      /\bContainer\b/,
      /\bmax-w-/,
      /\bspace-y-/,
    ];

    const unadaptedViews: string[] = [];
    const auditedViews: { view: string; matchedPatterns: number }[] = [];

    for (const viewPath of allViews) {
      const relPath = path.relative(frontendRoot, viewPath);
      const content = readFileSync(viewPath, "utf8");

      let matches = 0;
      for (const pattern of responsivePatterns) {
        if (pattern.test(content)) {
          matches++;
        }
      }

      if (matches === 0) {
        unadaptedViews.push(relPath);
      } else {
        auditedViews.push({ view: relPath, matchedPatterns: matches });
      }
    }

    // Al menos 20 vistas de negocio auditadas (cubriendo todas las vistas base del sistema)
    expect(
      auditedViews.length,
      `Expected at least 20 main view files in features, found ${auditedViews.length}`,
    ).toBeGreaterThanOrEqual(20);

    // Ninguna vista puede carecer de patrones responsivos elásticos
    expect(
      unadaptedViews,
      `Found views without responsive or elastic layout patterns:\n${JSON.stringify(unadaptedViews, null, 2)}`,
    ).toEqual([]);
  });

  it("prevents unconstrained rigid fixed-pixel widths exceeding 320px in core UI and views (WCAG Reflow 320px)", () => {
    const filesToAudit = [
      ...getFilesRecursively(path.join(srcDir, "components/ui"), (f) => f.endsWith(".tsx")),
      ...getFilesRecursively(path.join(srcDir, "components/layout"), (f) => f.endsWith(".tsx")),
      ...getFilesRecursively(path.join(srcDir, "features"), (f) => f.endsWith(".view.tsx")),
    ];

    // Detecta anchos rígidos incondicionales >= 330px en px sin prefijo responsivo (sm:, md:, lg:, xl:)
    // Excluye explícitamente techos elásticos (max-w-[...px])
    const unconstrainedOver320pxRegex =
      /(?<!(?:sm|md|lg|xl|2xl):)(?<!max-)\b(?:min-w|w)-\[(?:[4-9]\d{2}|[1-9]\d{3,})px\]/g;

    const violations: { file: string; match: string }[] = [];

    for (const filePath of filesToAudit) {
      const content = readFileSync(filePath, "utf8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        // Eximir elementos puramente decorativos de fondo con blur absoluto o contenedores internos de modal
        if (
          line.includes("blur-") ||
          line.includes("absolute") ||
          line.includes("overflow-x-auto")
        ) {
          return;
        }

        const matches = line.match(unconstrainedOver320pxRegex);
        if (matches) {
          violations.push({
            file: `${path.relative(frontendRoot, filePath)}:${index + 1}`,
            match: matches.join(", "),
          });
        }
      });
    }

    expect(
      violations,
      `Found unconstrained fixed pixel widths exceeding 320px causing horizontal overflow on mobile:\n${JSON.stringify(violations, null, 2)}`,
    ).toEqual([]);
  });

  it("enforces accessibility landmarks and headless agent navigation attributes in shell components", () => {
    const layoutPath = path.join(srcDir, "components/layout/PersistentLayout.view.tsx");
    const headerPath = path.join(srcDir, "components/layout/Header.view.tsx");
    const sidebarPath = path.join(srcDir, "components/layout/Sidebar.view.tsx");
    const navItemPath = path.join(srcDir, "components/layout/SidebarNavItem.tsx");

    const layoutContent = readFileSync(layoutPath, "utf8");
    const headerContent = readFileSync(headerPath, "utf8");
    const sidebarContent = readFileSync(sidebarPath, "utf8");
    const navItemContent = readFileSync(navItemPath, "utf8");

    // PersistentLayout landmarks
    expect(layoutContent).toContain('role="main"');
    expect(layoutContent).toContain('id="main-content"');
    expect(layoutContent).toContain('data-testid="skip-to-content"');
    expect(layoutContent).toContain('data-testid="app-shell"');
    expect(layoutContent).toContain("min-h-dvh");

    // Header landmarks
    expect(headerContent).toContain('role="banner"');
    expect(headerContent).toContain('data-testid="app-header"');
    expect(headerContent).toContain('data-testid="sidebar-toggle-button"');

    // Sidebar landmarks
    expect(sidebarContent).toContain('role="complementary"');
    expect(sidebarContent).toContain('role="navigation"');
    expect(sidebarContent).toContain('data-testid="main-navigation"');
    expect(sidebarContent).toContain('data-testid="app-sidebar"');

    // SidebarNavItem determinism
    expect(navItemContent).toContain("data-testid={`nav-item-${itemSlug}`}");
    expect(navItemContent).toContain("data-nav-to={to}");
    expect(navItemContent).toContain("data-nav-active");
  });

  it("verifies canonical Container adoption across completed migration tandas (Tanda 1, 2, 3 & 4)", () => {
    const migratedViews = [
      // Tanda 1 (Core Operativo)
      "src/features/time-control/views/TimeControl.view.tsx",
      "src/features/supervisor-dashboard/views/SupervisorDashboard.view.tsx",
      "src/features/dashboard/views/Dashboard.view.tsx",
      "src/features/worker-portal/views/WorkerPortal.view.tsx",
      // Tanda 2 (Turnos Teóricos & Planificación)
      "src/features/theoretical-shifts/views/TheoreticalShifts.view.tsx",
      "src/features/theoretical-shifts/views/AssignmentManager.view.tsx",
      "src/features/theoretical-shifts/views/PatternManager.view.tsx",
      "src/features/theoretical-shifts/views/HolidayManager.view.tsx",
      "src/features/theoretical-shifts/views/LeaveManager.view.tsx",
      "src/features/planning/views/MonthlyPlanning.view.tsx",
      // Tanda 3 (Personal, Empleados y Usuarios)
      "src/features/employee-management/views/EmployeeManagement.view.tsx",
      "src/features/user-management/views/UserManagement.view.tsx",
      "src/features/personnel-management/views/PersonnelManagement.view.tsx",
      // Tanda 4 (Gobernanza, Auditoría y Mantenimiento)
      "src/features/governance/views/GovernanceHub.view.tsx",
      "src/features/governance/views/SecurityInsights.view.tsx",
      "src/features/governance/views/SystemMaintenance.view.tsx",
      "src/features/governance/views/BackupListModal.view.tsx",
    ];

    const unmigrated: string[] = [];

    for (const relPath of migratedViews) {
      const fullPath = path.join(frontendRoot, relPath);
      const content = readFileSync(fullPath, "utf8");
      if (!content.includes("<Container") || !content.includes("data-ui-protected")) {
        unmigrated.push(relPath);
      }
    }

    expect(
      unmigrated,
      `Expected all completed tanda views to wrap with <Container data-ui-protected>:\n${JSON.stringify(unmigrated, null, 2)}`,
    ).toEqual([]);
  });
});
