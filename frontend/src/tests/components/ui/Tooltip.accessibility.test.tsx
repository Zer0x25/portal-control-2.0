import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Tooltip from "../../../components/ui/Tooltip";
import LoadingOverlay from "../../../components/ui/LoadingOverlay";

describe("accessible tooltip", () => {
  it("describes and opens for the focused trigger, then closes on blur", () => {
    render(
      <Tooltip content="Detalle ampliado">
        <button type="button">Ver detalle</button>
      </Tooltip>,
    );

    const trigger = screen.getByText("Ver detalle");
    const tooltip = screen.getByRole("tooltip");

    expect(trigger).toHaveAttribute("aria-describedby", tooltip.id);
    expect(tooltip).toHaveClass("invisible");

    fireEvent.focus(trigger);
    expect(tooltip).toHaveClass("visible");

    fireEvent.blur(trigger);
    expect(tooltip).toHaveClass("invisible");
  });
});

describe("LoadingOverlay accessibility", () => {
  it("announces loading as a polite status instead of interrupting as an alert", () => {
    render(<LoadingOverlay message="Cargando reportes" fullScreen={false} />);

    const status = screen.getByRole("status");
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Cargando reportes")).toBeInTheDocument();
  });
});
