import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActionButton } from "../../../features/dashboard/components/ui/ActionButton";

// Mock de icono
const MockIcon = () => <svg data-testid="mock-icon" />;

describe("ActionButton", () => {
  it("should render button variant correctly", () => {
    render(<ActionButton color="emerald" icon={MockIcon} label="Test Action" onClick={() => {}} />);

    expect(screen.getByText("Test Action")).toBeInTheDocument();
    expect(screen.getByTestId("mock-icon")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should render link variant correctly", () => {
    render(<ActionButton color="indigo" icon={MockIcon} label="Test Link" href="/test-link" />);

    const link = screen.getByRole("link");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/test-link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("should apply correct color classes", () => {
    const { rerender } = render(
      <ActionButton color="emerald" icon={MockIcon} label="Test" onClick={() => {}} />,
    );

    expect(screen.getByRole("button")).toHaveClass("text-emerald-600");

    rerender(<ActionButton color="orange" icon={MockIcon} label="Test" onClick={() => {}} />);

    expect(screen.getByRole("button")).toHaveClass("text-orange-600");
  });

  it("should show notification indicator when hasNotification is true", () => {
    render(
      <ActionButton
        color="emerald"
        icon={MockIcon}
        label="Test"
        onClick={() => {}}
        hasNotification={true}
      />,
    );

    // The notification indicator is a span with specific classes
    const notification = document.querySelector(".bg-rose-600");
    expect(notification).toBeInTheDocument();
  });

  it("should not show notification indicator when hasNotification is false", () => {
    render(
      <ActionButton
        color="emerald"
        icon={MockIcon}
        label="Test"
        onClick={() => {}}
        hasNotification={false}
      />,
    );

    const notification = document.querySelector(".bg-rose-600");
    expect(notification).not.toBeInTheDocument();
  });

  it("should call onClick when button is clicked", async () => {
    const user = userEvent.setup();
    const mockOnClick = vi.fn();

    render(<ActionButton color="emerald" icon={MockIcon} label="Test" onClick={mockOnClick} />);

    await user.click(screen.getByRole("button"));

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it("should apply disabled state correctly", () => {
    render(
      <ActionButton
        color="emerald"
        icon={MockIcon}
        label="Test"
        onClick={() => {}}
        disabled={true}
      />,
    );

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveClass("opacity-50", "cursor-not-allowed");
  });

  it("should apply custom className", () => {
    render(
      <ActionButton
        color="emerald"
        icon={MockIcon}
        label="Test"
        onClick={() => {}}
        className="custom-class"
      />,
    );

    expect(screen.getByRole("button")).toHaveClass("custom-class");
  });

  it("should have correct base classes", () => {
    render(<ActionButton color="emerald" icon={MockIcon} label="Test" onClick={() => {}} />);

    const button = screen.getByRole("button");
    expect(button).toHaveClass(
      "group",
      "relative",
      "p-3.5",
      "h-[90px]",
      "rounded-sm",
      "flex",
      "flex-col",
      "items-center",
      "justify-center",
      "text-center",
    );
  });

  it("should handle keyboard navigation", async () => {
    const user = userEvent.setup();
    const mockOnClick = vi.fn();

    render(<ActionButton color="emerald" icon={MockIcon} label="Test" onClick={mockOnClick} />);

    const button = screen.getByRole("button");
    button.focus();
    expect(button).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(mockOnClick).toHaveBeenCalledTimes(1);

    await user.keyboard(" ");
    expect(mockOnClick).toHaveBeenCalledTimes(2);
  });
});
