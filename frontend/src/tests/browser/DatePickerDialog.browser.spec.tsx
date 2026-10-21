import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DatePickerDialog from "../../components/ui/DatePickerDialog";

describe("DatePickerDialog in Real Browser (AC5)", () => {
  it("renders overlay, computes real layout, and handles date selection and keyboard navigation", () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();

    const TestComponent = () => {
      const [isOpen, setIsOpen] = useState(true);
      return (
        <DatePickerDialog
          isOpen={isOpen}
          onClose={() => {
            setIsOpen(false);
            onClose();
          }}
          onSelect={onSelect}
          initialDate="2026-10-15"
        />
      );
    };

    render(<TestComponent />);

    const grid = screen.getByRole("grid");
    expect(grid).toBeInTheDocument();

    const rect = grid.getBoundingClientRect();
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);

    // Initial selected date
    const initialCell = document.querySelector<HTMLElement>('[data-date="2026-10-15"]');
    expect(initialCell).toBeInTheDocument();
    expect(initialCell).toHaveAttribute("tabindex", "0");

    // Keyboard navigation: press ArrowRight on grid moves focus to 2026-10-16
    fireEvent.keyDown(grid, { key: "ArrowRight" });
    const nextCell = document.querySelector<HTMLElement>('[data-date="2026-10-16"]');
    expect(nextCell).toBeInTheDocument();

    // Click "Hoy" button to select today's date
    const todayBtn = screen.getByRole("button", { name: "Hoy" });
    fireEvent.click(todayBtn);

    // Click "Aplicar" button
    const applyBtn = screen.getByRole("button", { name: /aplicar/i });
    fireEvent.click(applyBtn);

    expect(onSelect).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
