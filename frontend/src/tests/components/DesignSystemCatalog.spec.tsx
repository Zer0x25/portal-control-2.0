import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, fireEvent } from "@testing-library/react";
import DesignSystemCatalogView from "../../features/design-system/views/DesignSystemCatalog.view";

/**
 * Spec 031 T18 (AC12): el catalogo del design system es una ruta navegable
 * del app (no solo un panel de desarrollador).
 */

const currentDir = path.dirname(new URL(import.meta.url).pathname);
const frontendRoot = path.resolve(currentDir, "../../..");

describe("Catalogo del design system (spec 031 AC12)", () => {
  it("expone las secciones del catalogo con tabs accesibles", () => {
    render(<DesignSystemCatalogView />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBeGreaterThanOrEqual(4);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
  });

  it("documenta las primitivas con variantes y uso", () => {
    render(<DesignSystemCatalogView />);

    // La documentacion de Button vive en la seccion de formularios.
    fireEvent.click(screen.getByRole("tab", { name: /Formularios/i }));

    expect(screen.getByText("Button")).toBeInTheDocument();
    expect(screen.getByText("src/components/ui/Button.tsx")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Acción disparadora. La variante comunica jerarquía: una sola acción primaria por pantalla.",
      ),
    ).toBeInTheDocument();
  });

  it("la ruta /design-system existe y esta restringida a Administrador", () => {
    const constants = readFileSync(path.join(frontendRoot, "src/constants.ts"), "utf8");
    expect(constants).toContain('DESIGN_SYSTEM: "/design-system"');

    const app = readFileSync(path.join(frontendRoot, "src/App.tsx"), "utf8");
    expect(app).toContain("ROUTES.DESIGN_SYSTEM");
    expect(app).toMatch(/ROUTES\.DESIGN_SYSTEM[\s\S]{0,400}requiredRoles=\{\[ROLES\.ADMIN\]\}/);
  });

  it("el Sidebar ofrece el catalogo solo a Administrador", () => {
    const sidebarMenu = readFileSync(
      path.join(frontendRoot, "src/hooks/layout/sidebarMenu.ts"),
      "utf8",
    );
    expect(sidebarMenu).toContain("ROUTES.DESIGN_SYSTEM");
    expect(sidebarMenu).toMatch(/role === "Administrador"[\s\S]{0,200}ROUTES\.DESIGN_SYSTEM/);
  });

  it("el showcase modal queda reemplazado por la ruta", () => {
    const developerPanel = readFileSync(
      path.join(frontendRoot, "src/features/configuration/components/DeveloperPanel.tsx"),
      "utf8",
    );
    expect(developerPanel).toContain("navigate(ROUTES.DESIGN_SYSTEM)");
    expect(developerPanel).not.toContain("DesignSystemShowcaseModal");
  });
});
