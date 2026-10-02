import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import QuickActionsPanel from "../../../features/dashboard/components/QuickActionsPanel";

// Mock de hooks
vi.mock("../../../features/dashboard/hooks/useQuickActionsLogic", () => ({
  useQuickActionsLogic: () => ({
    actions: [
      {
        id: "time",
        label: "Horarios",
        icon: () => <svg data-testid="clock-icon" />,
        route: "/time-control",
        color: "emerald",
      },
      {
        id: "log",
        label: "Novedades",
        icon: () => <svg data-testid="book-icon" />,
        route: "/logbook",
        color: "indigo",
      },
    ],
    handleNavigate: vi.fn(),
  }),
}));

// Mock de Card
vi.mock("../../../components/ui/Card", () => ({
  default: ({ title, children }: any) => (
    <div data-testid="card">
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  ),
}));

describe("QuickActionsPanel Integration", () => {
  it("should render complete panel with actions", () => {
    render(<QuickActionsPanel />);

    expect(screen.getByTestId("card")).toBeInTheDocument();
    expect(screen.getByText("Accesos Rápidos")).toBeInTheDocument();

    // Should render both action buttons
    expect(screen.getByText("Horarios")).toBeInTheDocument();
    expect(screen.getByText("Novedades")).toBeInTheDocument();

    // Should render icons
    expect(screen.getByTestId("clock-icon")).toBeInTheDocument();
    expect(screen.getByTestId("book-icon")).toBeInTheDocument();
  });

  it("should render actions in grid layout", () => {
    render(<QuickActionsPanel />);

    const grid = screen.getByText("Horarios").closest("div");
    expect(grid).toHaveClass("grid", "grid-cols-2", "gap-3", "py-1");
  });
});
