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
    const trigger = screen.getByRole("button", { name: /periodo de consulta.*noviembre 2026/i });

    trigger.focus();
    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();

    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: /ene/i }));
    expect(onChange).toHaveBeenCalledOnce();
    expect(trigger).toHaveFocus();
  });

  it("renderiza el panel en un portal fuera del contenedor de la tarjeta", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <div data-testid="card">
        <CalendarMonthSelector currentDate={new Date(2026, 10, 1)} onChange={vi.fn()} />
      </div>,
    );
    const trigger = screen.getByRole("button", { name: /periodo de consulta.*noviembre 2026/i });
    await user.click(trigger);

    const panel = screen.getByRole("button", { name: /ene/i }).closest("div.fixed");
    expect(panel).not.toBeNull();
    expect(container.contains(panel)).toBe(false);
    expect(panel?.parentElement).toBe(document.body);
  });
});

describe("AuditMonthSelector", () => {
  it("abre con teclado y devuelve el foco al cerrar o elegir un mes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AuditMonthSelector currentDate={new Date(2026, 10, 1)} onChange={onChange} />);
    const trigger = screen.getByRole("button", { name: /periodo de consulta.*noviembre 2026/i });
    trigger.focus();
    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: /ene/i }));
    expect(onChange).toHaveBeenCalledOnce();
    expect(trigger).toHaveFocus();
  });
});
