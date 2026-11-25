import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import FilterSelect from "../../../components/ui/FilterSelect";

const OPTIONS = [
  { value: "", label: "Todas las Jornadas" },
  { value: "Ordinaria", label: "Ordinaria" },
];

describe("FilterSelect Component", () => {
  it("vincula la etiqueta visible con el control y expone el chevron decorativo", () => {
    render(<FilterSelect label="Tipo de Jornada" value="" onChange={vi.fn()} options={OPTIONS} />);

    const select = screen.getByLabelText("Tipo de Jornada");
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe("SELECT");
    // El chevron es decorativo: no debe sumar un segundo nombre accesible.
    expect(select.parentElement?.querySelectorAll("svg")).toHaveLength(1);
    expect(select.parentElement?.querySelector("svg")?.closest("[aria-hidden]")).not.toBeNull();
  });

  it("mantiene la altura táctil mínima de 44 px y el radio canónico", () => {
    render(<FilterSelect label="Área" value="" onChange={vi.fn()} options={OPTIONS} />);

    const select = screen.getByLabelText("Área");
    expect(select).toHaveClass("h-[44px]");
    expect(select).toHaveClass("min-h-[44px]");
    expect(select).toHaveClass("rounded-md");
    expect(select).toHaveClass("appearance-none");
  });

  it("propaga el cambio de valor y conserva el id provisto", () => {
    const onChange = vi.fn();
    render(
      <FilterSelect
        id="kpi-workday-type"
        label="Tipo de Jornada"
        value=""
        onChange={onChange}
        options={OPTIONS}
      />,
    );

    fireEvent.change(screen.getByLabelText("Tipo de Jornada"), {
      target: { value: "Ordinaria" },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(document.getElementById("kpi-workday-type")).not.toBeNull();
  });

  it("vincula el error con aria-invalid y aria-describedby", () => {
    render(
      <FilterSelect
        label="Área"
        value=""
        onChange={vi.fn()}
        options={OPTIONS}
        error="Selecciona un área válida"
      />,
    );

    const select = screen.getByLabelText("Área");
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toHaveAttribute("aria-describedby", `${select.id}-error`);
    expect(screen.getByText("Selecciona un área válida")).toBeInTheDocument();
  });
});
