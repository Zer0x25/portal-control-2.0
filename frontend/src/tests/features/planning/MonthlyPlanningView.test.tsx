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
});
