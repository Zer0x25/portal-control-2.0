import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, fireEvent } from "@testing-library/react";
import DesignSystemCatalogView from "../../features/design-system/containers/DesignSystemCatalog.container";

/** Spec 038: la ruta expone tokens y el catálogo certificado de Storybook. */

const currentDir = path.dirname(new URL(import.meta.url).pathname);
const frontendRoot = path.resolve(currentDir, "../../..");

describe("Catálogo del design system (spec 038)", () => {
  it("expone las secciones de tokens y Storybook con tabs accesibles", () => {
    render(<DesignSystemCatalogView />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveTextContent("Tokens Semánticos");
    expect(tabs[1]).toHaveTextContent("Catálogo Storybook");
    expect(screen.getByText(/Catálogo generado desde/)).toBeInTheDocument();
  });

  it("muestra las entradas certificadas y sus historias al abrir Storybook", () => {
    render(<DesignSystemCatalogView />);

    fireEvent.click(screen.getByRole("tab", { name: /Catálogo Storybook/i }));

    expect(
      screen.getByText(/68 entradas enlazadas a sus historias de Storybook/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir Storybook" })).toBeInTheDocument();
    expect(screen.getByText("Button")).toBeInTheDocument();
    expect(screen.getByText("src/components/ui/Button.tsx")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Ver historia" }).length).toBeGreaterThan(0);
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
    const developerPanelController = readFileSync(
      path.join(frontendRoot, "src/features/configuration/hooks/useDeveloperPanelController.ts"),
      "utf8",
    );
    const developerPanelView = readFileSync(
      path.join(frontendRoot, "src/features/configuration/views/DeveloperPanel.view.tsx"),
      "utf8",
    );
    expect(developerPanelController).toContain("navigate(ROUTES.DESIGN_SYSTEM)");
    expect(developerPanelView).not.toContain("DesignSystemShowcaseModal");
  });
});
