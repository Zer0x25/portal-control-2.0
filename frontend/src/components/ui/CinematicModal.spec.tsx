import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CinematicModal from "./CinematicModal";

describe("CinematicModal (CSS-first)", () => {
  it("no renderiza nada cuando está cerrado", () => {
    const { container } = render(
      <CinematicModal isOpen={false} onClose={() => undefined} title="T">
        <p>hola</p>
      </CinematicModal>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza dialog con labelledby y cierra con Escape y overlay", () => {
    const onClose = vi.fn();
    render(
      <CinematicModal isOpen onClose={onClose} title="Mi título">
        <p>contenido</p>
      </CinematicModal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    const labelledBy = dialog.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy ?? "")).toHaveTextContent("Mi título");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("atrapa el Tab dentro del modal (wrap en ambos extremos)", () => {
    const onClose = vi.fn();
    render(
      <CinematicModal isOpen onClose={onClose} title="T" showCloseButton={false}>
        <button>primero</button>
        <button>segundo</button>
      </CinematicModal>,
    );
    // El panel recibe el foco inicial.
    expect(document.activeElement?.getAttribute("role")).toBe("dialog");

    const second = screen.getByText("segundo");
    second.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toHaveTextContent("primero");

    const first = screen.getByText("primero");
    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toHaveTextContent("segundo");
  });
});
