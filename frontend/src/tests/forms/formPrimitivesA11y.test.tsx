import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Switch from "../../components/ui/Switch";
import Textarea from "../../components/ui/Textarea";

/**
 * Spec 036 T4 (AC3): contrato de accesibilidad de error de las primitivas.
 *
 * La regla de `.agents/rules/design-system-governance.md` §5 exige
 * `aria-invalid` + `aria-describedby` en todo control con error, pero antes
 * de esta spec **nada lo verificaba** y el defecto era real: `Input` y
 * `Textarea` solo asociaban el mensaje si el consumidor pasaba `id`.
 */

describe("a11y de error de las primitivas de formulario (spec 036 AC3)", () => {
  it("Input sin id: el mensaje de error queda asociado al control", () => {
    render(<Input label="NOMBRE" error="Campo obligatorio" />);

    const input = screen.getByLabelText("NOMBRE");
    expect(input).toHaveAttribute("aria-invalid", "true");

    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)).toHaveTextContent("Campo obligatorio");
  });

  it("Input con id explícito: htmlFor, id y describedby apuntan al mismo id", () => {
    render(<Input id="employeeName" label="NOMBRE" error="Campo obligatorio" />);

    const input = screen.getByLabelText("NOMBRE");
    expect(input).toHaveAttribute("id", "employeeName");
    expect(input.getAttribute("aria-describedby")).toBe("employeeName-error");
    expect(document.getElementById("employeeName-error")).toHaveTextContent("Campo obligatorio");
  });

  it("Input sin error: no marca aria-invalid ni aria-describedby", () => {
    render(<Input label="NOMBRE" />);

    const input = screen.getByLabelText("NOMBRE");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("Textarea sin id: el mensaje de error queda asociado al control", () => {
    render(<Textarea label="NOTAS" error="Máximo 10 caracteres" />);

    const textarea = screen.getByLabelText("NOTAS");
    expect(textarea).toHaveAttribute("aria-invalid", "true");

    const describedBy = textarea.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)).toHaveTextContent(
      "Máximo 10 caracteres",
    );
  });

  it("Select mantiene el contrato: id, htmlFor y describedby", () => {
    render(
      <Select label="ÁREA" error="Seleccione un área" options={[{ value: "a", label: "A" }]} />,
    );

    const select = screen.getByLabelText("ÁREA");
    expect(select).toHaveAttribute("aria-invalid", "true");
    const describedBy = select.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)).toHaveTextContent("Seleccione un área");
  });

  it("Switch: el error se asocia y el label da el nombre accesible", () => {
    render(
      <Switch
        checked={false}
        onChange={() => undefined}
        label="ACTIVO"
        error="Debe estar activo"
      />,
    );

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAccessibleName("ACTIVO");
    expect(toggle).toHaveAttribute("aria-invalid", "true");

    const describedBy = toggle.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)).toHaveTextContent("Debe estar activo");
  });

  it("Switch: aria-label explícito gana sobre label", () => {
    render(
      <Switch
        checked={false}
        onChange={() => undefined}
        label="ACTIVO"
        aria-label="Generar cuenta"
      />,
    );

    expect(screen.getByRole("switch")).toHaveAccessibleName("Generar cuenta");
  });
});
