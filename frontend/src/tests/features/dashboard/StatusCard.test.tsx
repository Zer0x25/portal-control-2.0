import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusCard, ShiftStatusCard } from "../../../features/dashboard/components/ui/StatusCard";
import { StatusInfo } from "../../../features/dashboard/types";

// Mock de iconos
vi.mock("../../../../components/ui/icons/index", () => ({
  BookOpenIcon: () => <svg data-testid="book-icon" />,
}));

// Simplificar el test removiendo la verificación del icon-box
// ya que el foco está en las clases CSS

const mockStatus: StatusInfo = {
  text: "En Turno",
  icon: <svg data-testid="status-icon" />,
  variant: "success",
  textColor: "text-emerald-700 dark:text-emerald-400",
  borderColor: "border-emerald-500/20",
};

describe("StatusCard", () => {
  it("should render status information correctly", () => {
    render(<StatusCard status={mockStatus} timeText="Desde las 08:30" />);

    expect(screen.getByText("En Turno")).toBeInTheDocument();
    expect(screen.getByText("Desde las 08:30")).toBeInTheDocument();
    expect(screen.getByTestId("status-icon")).toBeInTheDocument();
  });

  it("should apply correct CSS classes", () => {
    render(<StatusCard status={mockStatus} />);

    // Buscar el div principal que contiene las clases de border y bg
    const card = screen.getByText("En Turno").parentElement?.parentElement;
    expect(card).toHaveClass(
      "flex",
      "items-center",
      "justify-start",
      "gap-3.5",
      "p-3.5",
      "rounded-md",
      "border-emerald-500/20",
      "bg-token-surface-stripe",
    );
  });

  it("should render without time text", () => {
    render(<StatusCard status={mockStatus} />);

    expect(screen.getByText("En Turno")).toBeInTheDocument();
    expect(screen.queryByText("Desde las")).not.toBeInTheDocument();
  });

  it("should apply custom className", () => {
    render(<StatusCard status={mockStatus} className="custom-status-card" />);

    const card = screen.getByText("En Turno").parentElement?.parentElement;
    expect(card).toHaveClass("custom-status-card");
  });

  it("should handle different status variants", () => {
    const dangerStatus: StatusInfo = {
      ...mockStatus,
      text: "Fuera de Turno",
      variant: "danger",
      textColor: "text-red-700 dark:text-red-400",
      borderColor: "border-red-500/20",
    };

    render(<StatusCard status={dangerStatus} />);

    const card = screen.getByText("Fuera de Turno").parentElement?.parentElement;
    expect(card).toHaveClass("border-red-500/20");
  });
});

describe("ShiftStatusCard", () => {
  it("should render shift status correctly", () => {
    render(<ShiftStatusCard responsibleName="Juan Pérez" />);

    expect(screen.getByText("Turno en curso")).toBeInTheDocument();
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
  });

  it("should apply correct CSS classes", () => {
    render(<ShiftStatusCard responsibleName="Test User" />);

    const card = document.querySelector(".border-token-border-subtle.bg-token-surface-card");
    expect(card).toHaveClass(
      "flex",
      "items-center",
      "justify-start",
      "gap-3.5",
      "p-3.5",
      "rounded-md",
      "border-token-border-subtle",
      "bg-token-surface-card",
    );
  });

  it("should apply custom className", () => {
    render(<ShiftStatusCard responsibleName="Test User" className="custom-shift-card" />);

    const card = document.querySelector(".custom-shift-card");
    expect(card).toHaveClass("custom-shift-card");
  });

  it("should handle long responsible names with truncation", () => {
    render(<ShiftStatusCard responsibleName="Un Nombre Muy Largo Que Debería Truncarse" />);

    const nameElement = screen.getByText("Un Nombre Muy Largo Que Debería Truncarse");
    expect(nameElement).toHaveClass("truncate");
  });
});
