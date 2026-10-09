import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Container from "../../../components/ui/Container";

describe("Container Component", () => {
  it("renders children correctly", () => {
    render(<Container>Test Content</Container>);
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("applies default standard variant, centering, and responsive padding classes", () => {
    render(<Container>Default Layout</Container>);
    const element = screen.getByTestId("page-container");
    expect(element).toHaveClass("w-full");
    expect(element).toHaveClass("mx-auto");
    expect(element).toHaveClass("max-w-7xl");
    expect(element).toHaveClass("px-4");
    expect(element).toHaveClass("sm:px-6");
    expect(element).toHaveClass("lg:px-8");
  });

  it("applies wide variant correctly (1440px max width)", () => {
    render(<Container variant="wide">Wide Layout</Container>);
    const element = screen.getByTestId("page-container");
    expect(element).toHaveClass("max-w-[1440px]");
  });

  it("applies narrow variant correctly (4xl max width)", () => {
    render(<Container variant="narrow">Narrow Layout</Container>);
    const element = screen.getByTestId("page-container");
    expect(element).toHaveClass("max-w-4xl");
  });

  it("applies fluid variant correctly (full width without cap)", () => {
    render(<Container variant="fluid">Fluid Layout</Container>);
    const element = screen.getByTestId("page-container");
    expect(element).toHaveClass("max-w-none");
  });

  it("removes horizontal padding when noPadding is true", () => {
    render(<Container noPadding>No Padding</Container>);
    const element = screen.getByTestId("page-container");
    expect(element).not.toHaveClass("px-4");
    expect(element).not.toHaveClass("sm:px-6");
    expect(element).not.toHaveClass("lg:px-8");
  });

  it("applies safe-area class when withSafeArea is true", () => {
    render(<Container withSafeArea>Safe Area</Container>);
    const element = screen.getByTestId("page-container");
    expect(element).toHaveClass("pb-safe");
  });

  it("renders custom polymorphic element via as prop", () => {
    render(
      <Container as="section" data-testid="custom-section">
        Section Content
      </Container>,
    );
    const element = screen.getByTestId("custom-section");
    expect(element.tagName.toLowerCase()).toBe("section");
  });

  it("merges custom className cleanly", () => {
    render(<Container className="custom-class-123">Custom Class</Container>);
    const element = screen.getByTestId("page-container");
    expect(element).toHaveClass("custom-class-123");
  });
});
