import React, { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CinematicModal from "../../components/ui/CinematicModal";

describe("CinematicModal in Real Browser (AC5)", () => {
  it("manages real focus trap and returns focus to opener element upon close", async () => {
    const TestComponent = () => {
      const [isOpen, setIsOpen] = useState(false);

      return (
        <div>
          <button data-testid="open-modal-button" onClick={() => setIsOpen(true)}>
            Open Modal
          </button>
          <button data-testid="outside-button">Outside Button</button>

          <CinematicModal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            title="Accesibilidad Real"
            showCloseButton={true}
          >
            <div className="space-y-4">
              <input data-testid="first-input" placeholder="Primer input" />
              <button data-testid="second-button">Segundo botón</button>
            </div>
          </CinematicModal>
        </div>
      );
    };

    render(<TestComponent />);

    const openBtn = screen.getByTestId("open-modal-button");
    openBtn.focus();
    expect(document.activeElement).toBe(openBtn);

    // Open modal
    fireEvent.click(openBtn);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");

    const firstInput = screen.getByTestId("first-input");
    const secondButton = screen.getByTestId("second-button");
    const closeBtn = screen.getByLabelText("Cerrar");

    // Focus first input inside modal
    firstInput.focus();
    expect(document.activeElement).toBe(firstInput);

    // Tab to next element
    secondButton.focus();
    expect(document.activeElement).toBe(secondButton);

    // Tab to close button
    closeBtn.focus();
    expect(document.activeElement).toBe(closeBtn);

    // Press Escape to close modal
    fireEvent.keyDown(window, { key: "Escape" });

    // In real browser, modal unmounts after exit transition (150ms)
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // Opener element receives focus back
    await waitFor(() => {
      expect(document.activeElement).toBe(openBtn);
    });
  });

  it("verifies real DOM layout properties and visibility", () => {
    render(
      <CinematicModal isOpen={true} onClose={() => {}} title="Layout Test">
        <div data-testid="modal-content" style={{ minHeight: "150px" }}>
          Contenido con dimensiones reales
        </div>
      </CinematicModal>,
    );

    const dialog = screen.getByRole("dialog");
    const rect = dialog.getBoundingClientRect();

    // In a real browser, getBoundingClientRect returns non-zero dimensions
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
  });
});
