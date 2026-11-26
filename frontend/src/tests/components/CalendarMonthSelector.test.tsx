import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CalendarMonthSelector from "../../components/ui/CalendarMonthSelector";
import AuditMonthSelector from "../../components/ui/AuditMonthSelector";

vi.mock("../../hooks/useBusinessNow", () => ({
  useBusinessNow: () => new Date(2026, 10, 15),
}));

describe("CalendarMonthSelector", () => {
  it("abre con teclado y devuelve el foco al cerrar o elegir un mes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CalendarMonthSelector currentDate={new Date(2026, 10, 1)} onChange={onChange} />);
    const trigger = screen.getByRole("button", { name: /noviembre 2026/i });

    trigger.focus();
    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();

    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: /ene/i }));
    expect(onChange).toHaveBeenCalledOnce();
    // El panel permanece abierto para encadenar mes/año sin reabrirlo.
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
  });

  it("renderiza el panel en un portal fuera del contenedor de la tarjeta", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <div data-testid="card">
        <CalendarMonthSelector currentDate={new Date(2026, 10, 1)} onChange={vi.fn()} />
      </div>,
    );
    const trigger = screen.getByRole("button", { name: /noviembre 2026/i });
    await user.click(trigger);

    const panel = screen.getByRole("button", { name: /ene/i }).closest("div.fixed");
    expect(panel).not.toBeNull();
    expect(container.contains(panel)).toBe(false);
    expect(panel?.parentElement).toBe(document.body);
  });

  it("navega entre meses sin cerrar el panel y respeta los límites del intervalo", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const Harness = () => {
      const [date, setDate] = React.useState(new Date(2026, 10, 1));
      return (
        <CalendarMonthSelector
          currentDate={date}
          onChange={(next) => {
            onChange(next);
            setDate(next);
          }}
        />
      );
    };
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: /noviembre 2026/i });
    await user.click(trigger);

    await user.click(screen.getByRole("button", { name: "oct" }));
    expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 9, 1));
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    // Diciembre del año en curso está bloqueado por ser futuro.
    expect(screen.getByRole("button", { name: "dic" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "dic" }));
    expect(onChange).toHaveBeenCalledTimes(1);

    // Tras cambiar el año el panel sigue abierto y la rejilla refleja el año nuevo.
    await user.click(screen.getByRole("button", { name: "2027" }));
    expect(onChange).toHaveBeenLastCalledWith(new Date(2027, 9, 1));
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("button", { name: "dic" }));
    expect(onChange).toHaveBeenLastCalledWith(new Date(2027, 11, 1));
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(onChange).toHaveBeenCalledTimes(3);

    await user.click(screen.getByRole("button", { name: />Actual/ }));
    expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 10, 15));
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });
});

describe("AuditMonthSelector", () => {
  it("abre con teclado y devuelve el foco al cerrar o elegir un mes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AuditMonthSelector currentDate={new Date(2026, 10, 1)} onChange={onChange} />);
    const trigger = screen.getByRole("button", { name: /noviembre 2026/i });
    trigger.focus();
    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: /ene/i }));
    expect(onChange).toHaveBeenCalledOnce();
    // El panel permanece abierto para encadenar mes/año sin reabrirlo.
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
  });
});
