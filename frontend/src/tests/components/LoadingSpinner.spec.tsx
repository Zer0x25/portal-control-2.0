import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

/**
 * Spec 031 T14 (AC9): LoadingSpinner es la unica primitiva de spinner.
 */

describe("LoadingSpinner (spec 031 AC9)", () => {
  it("expone role=status con nombre accesible", () => {
    render(<LoadingSpinner />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-label", "Cargando");
  });

  it("usa el label visible como nombre accesible", () => {
    render(<LoadingSpinner label="Sincronizando" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Sincronizando");
    expect(screen.getByText("Sincronizando")).toBeInTheDocument();
  });

  it("aplica las variantes de tamano", () => {
    const { container, rerender } = render(<LoadingSpinner size="xs" />);
    expect(container.innerHTML).toContain("h-4 w-4");

    rerender(<LoadingSpinner size="sm" />);
    expect(container.innerHTML).toContain("h-6 w-6");

    rerender(<LoadingSpinner size="md" />);
    expect(container.innerHTML).toContain("h-8 w-8");

    rerender(<LoadingSpinner size="lg" />);
    expect(container.innerHTML).toContain("h-12 w-12");

    rerender(<LoadingSpinner size="xl" />);
    expect(container.innerHTML).toContain("h-16 w-16");
  });

  it("aplica el tono onAccent para superficies de acento", () => {
    const { container } = render(<LoadingSpinner variant="onAccent" size="xs" />);
    expect(container.innerHTML).toContain("border-t-white");
  });

  it("en modo fullScreen cubre la pantalla", () => {
    const { container } = render(<LoadingSpinner fullScreen />);
    expect(container.innerHTML).toContain("fixed inset-0");
    expect(container.innerHTML).toContain("h-16 w-16");
  });

  it("el arco giratorio es la unica animacion de carga", () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    const html = container.innerHTML;
    expect(html).toContain("animate-spin");
    expect((html.match(/animate-spin/g) ?? []).length).toBe(1);
  });
});
