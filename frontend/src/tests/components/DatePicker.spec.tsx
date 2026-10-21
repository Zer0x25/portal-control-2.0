import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DatePickerCalendar, default as DatePicker } from "../../components/ui/DatePicker";
import DatePickerDialog from "../../components/ui/DatePickerDialog";

/**
 * Spec 031 T11 (AC7): unico date picker componible y accesible por teclado.
 */

const SELECTED = new Date(2026, 9, 20, 12, 0, 0); // 20-10-2026

function renderCalendar(props: Partial<React.ComponentProps<typeof DatePickerCalendar>> = {}) {
  const onSelect = vi.fn();
  render(
    <DatePickerCalendar
      selectedDate={SELECTED}
      onSelect={onSelect}
      initialMonth={SELECTED}
      {...props}
    />,
  );
  return { onSelect };
}

describe("DatePickerCalendar (spec 031 AC7)", () => {
  it("expone una grilla accesible con celdas y encabezados de columna", () => {
    renderCalendar();
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "LU",
      "MA",
      "MI",
      "JU",
      "VI",
      "SÁ",
      "DO",
    ]);
    expect(screen.getAllByRole("gridcell").length).toBeGreaterThan(27);
  });

  it("la semana empieza en lunes (weekStartsOn: 1)", () => {
    renderCalendar();
    const firstRow = screen.getAllByRole("row")[1];
    const firstCell = firstRow.querySelector("[data-date]");
    expect(firstCell?.getAttribute("data-date")).toBe("2026-09-28");
  });

  it("navega con flechas y mueve el foco al dia siguiente", async () => {
    renderCalendar();
    const current = document.querySelector<HTMLElement>('[data-date="2026-10-20"]');
    expect(current).not.toBeNull();
    current?.focus();

    fireEvent.keyDown(screen.getByRole("grid"), { key: "ArrowRight" });
    await waitFor(() =>
      expect(document.activeElement?.getAttribute("data-date")).toBe("2026-10-21"),
    );

    fireEvent.keyDown(screen.getByRole("grid"), { key: "ArrowDown" });
    await waitFor(() =>
      expect(document.activeElement?.getAttribute("data-date")).toBe("2026-10-28"),
    );

    fireEvent.keyDown(screen.getByRole("grid"), { key: "ArrowLeft" });
    await waitFor(() =>
      expect(document.activeElement?.getAttribute("data-date")).toBe("2026-10-27"),
    );

    fireEvent.keyDown(screen.getByRole("grid"), { key: "ArrowUp" });
    await waitFor(() =>
      expect(document.activeElement?.getAttribute("data-date")).toBe("2026-10-20"),
    );
  });

  it("Home/End saltan al inicio y fin de semana", async () => {
    renderCalendar();
    document.querySelector<HTMLElement>('[data-date="2026-10-20"]')?.focus();

    fireEvent.keyDown(screen.getByRole("grid"), { key: "End" });
    await waitFor(() =>
      expect(document.activeElement?.getAttribute("data-date")).toBe("2026-10-25"),
    );

    fireEvent.keyDown(screen.getByRole("grid"), { key: "Home" });
    await waitFor(() =>
      expect(document.activeElement?.getAttribute("data-date")).toBe("2026-10-19"),
    );
  });

  it("PageUp/PageDown cambian de mes", async () => {
    renderCalendar();
    document.querySelector<HTMLElement>('[data-date="2026-10-20"]')?.focus();

    fireEvent.keyDown(screen.getByRole("grid"), { key: "PageDown" });
    await waitFor(() =>
      expect(document.activeElement?.getAttribute("data-date")).toBe("2026-11-20"),
    );

    fireEvent.keyDown(screen.getByRole("grid"), { key: "PageUp" });
    await waitFor(() =>
      expect(document.activeElement?.getAttribute("data-date")).toBe("2026-10-20"),
    );
  });

  it("selecciona un dia con el raton y emite YYYY-MM-DD", () => {
    const { onSelect } = renderCalendar();
    fireEvent.click(document.querySelector<HTMLElement>('[data-date="2026-10-15"]')!);
    expect(onSelect).toHaveBeenCalledTimes(1);
    const emitted = onSelect.mock.calls[0][0] as Date;
    expect(emitted.getFullYear()).toBe(2026);
    expect(emitted.getMonth()).toBe(9);
    expect(emitted.getDate()).toBe(15);
  });
});

describe("DatePicker componible (spec 031 AC7)", () => {
  it("abre el panel, expone el calendario y emite el valor", () => {
    const onChange = vi.fn();
    render(<DatePicker id="fecha" label="Fecha" value="" onChange={onChange} />);

    const trigger = screen.getByRole("button", { name: /^Fecha$/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("grid")).toBeInTheDocument();

    fireEvent.click(document.querySelector<HTMLElement>('[data-date="2026-10-15"]')!);
    expect(onChange).toHaveBeenCalledWith("2026-10-15");
  });

  it("Escape cierra el panel y devuelve el foco al disparador", () => {
    render(<DatePicker id="fecha" label="Fecha" value="" onChange={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: /^Fecha$/i });
    fireEvent.click(trigger);
    expect(screen.getByRole("grid")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("grid")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});

describe("DatePickerDialog (spec 031 AC7)", () => {
  it("reutiliza la grilla accesible y confirma la fecha", () => {
    const onSelect = vi.fn();
    render(
      <DatePickerDialog isOpen onClose={vi.fn()} onSelect={onSelect} initialDate="2026-10-20" />,
    );

    expect(screen.getByRole("grid")).toBeInTheDocument();
    fireEvent.click(document.querySelector<HTMLElement>('[data-date="2026-10-15"]')!);
    fireEvent.click(screen.getByRole("button", { name: /aplicar/i }));
    expect(onSelect).toHaveBeenCalledWith("2026-10-15");
  });
});
