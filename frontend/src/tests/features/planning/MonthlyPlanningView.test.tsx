import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MonthlyPlanningView } from "../../../features/planning/views/MonthlyPlanning.view";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock("../../../features/planning/components/WizardContainer", () => ({
  default: () => <div>WIZARD-CONTAINER-MOCK</div>,
}));

describe("MonthlyPlanningView", () => {
  it("renders planning header and wizard container", () => {
    render(
      <MonthlyPlanningView
        title="Planificación Mensual"
        subtitle="Gestión estratégica de turnos y dotación"
        isEmbedded={false}
      />,
    );

    expect(screen.getByText("Planificación Mensual")).toBeInTheDocument();
    expect(screen.getByText("Gestión estratégica de turnos y dotación")).toBeInTheDocument();
    expect(screen.getByText("WIZARD-CONTAINER-MOCK")).toBeInTheDocument();
  });

  it("renders within canonical wide Container for scheduling matrix", () => {
    render(
      <MonthlyPlanningView
        title="Planificación Mensual"
        subtitle="Gestión estratégica de turnos y dotación"
      />,
    );

    const container = screen.getByTestId("page-container");
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass("max-w-[1440px]");
    expect(container).toHaveAttribute("data-ui-protected");
  });
});
