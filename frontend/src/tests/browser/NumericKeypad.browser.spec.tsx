import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NumericKeypad from "../../components/ui/NumericKeypad";

describe("NumericKeypad in Real Browser (AC5)", () => {
  it("interacts with pointer events and triggers key callbacks", () => {
    const onInput = vi.fn();
    const onDelete = vi.fn();
    const onConfirm = vi.fn();

    render(
      <NumericKeypad
        onInput={onInput}
        onDelete={onDelete}
        onConfirm={onConfirm}
        showConfirm={true}
      />,
    );

    const keypad = screen.getByTestId("kiosk-keypad");
    expect(keypad).toBeInTheDocument();

    const rect = keypad.getBoundingClientRect();
    expect(rect.width).toBeGreaterThan(0);

    // Click digit 5
    const key5 = screen.getByTestId("kiosk-key-5");
    fireEvent.click(key5);
    expect(onInput).toHaveBeenCalledWith("5");

    // Click digit 9
    const key9 = screen.getByTestId("kiosk-key-9");
    fireEvent.click(key9);
    expect(onInput).toHaveBeenCalledWith("9");

    // Keyboard activation on button
    fireEvent.keyDown(key5, { key: "Enter" });
    fireEvent.keyDown(key9, { key: " " });

    // Click backspace
    const deleteBtn = screen.getByLabelText("Borrar");
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledOnce();

    // Click confirm
    const confirmBtn = screen.getByTestId("kiosk-key-confirm");
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
