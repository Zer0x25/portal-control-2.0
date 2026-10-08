import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetricGrid, useTeamMetrics } from "../../../features/dashboard/components/ui/MetricGrid";
import { renderHook } from "@testing-library/react";
import React from "react";

// Mock de MetricCard
vi.mock("../../../../components/ui/MetricCard", () => ({
  default: ({ title, value, indicatorColor, onClick, className }: any) => {
    // Normalizar el título para data-testid
    const normalizedTitle = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remover acentos
      .replace(/[^a-z0-9]/g, ""); // Remover caracteres especiales

    return React.createElement(
      "div",
      {
        "data-testid": `metric-${normalizedTitle}`,
        className,
        onClick,
      },
      [
        React.createElement("span", { key: "title" }, title),
        React.createElement("span", { key: "value" }, value),
        React.createElement("span", { key: "color" }, indicatorColor),
      ],
    );
  },
}));

describe("MetricGrid", () => {
  const mockMetrics = [
    {
      title: "Presentes",
      value: 5,
      indicatorColor: "emerald" as const,
      onClick: vi.fn(),
      clickable: true,
    },
    {
      title: "Total",
      value: 10,
      indicatorColor: "slate" as const,
    },
    {
      title: "Anomalías",
      value: 2,
      indicatorColor: "orange" as const,
      onClick: vi.fn(),
      clickable: true,
    },
  ];

  it("should render all metrics", () => {
    render(<MetricGrid metrics={mockMetrics} />);

    expect(screen.getByText("Presentes")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Anomalías")).toBeInTheDocument();
  });

  it("should apply correct grid columns for default (3)", () => {
    render(<MetricGrid metrics={mockMetrics} />);

    // El grid es el contenedor principal
    const grid = document.querySelector(".grid");
    expect(grid).toHaveClass("grid-cols-1", "sm:grid-cols-3");
  });

  it("should apply correct grid columns for 2 columns", () => {
    render(<MetricGrid metrics={mockMetrics} columns={2} />);

    const grid = document.querySelector(".grid");
    expect(grid).toHaveClass("grid-cols-1", "sm:grid-cols-2");
  });

  it("should apply correct grid columns for 4 columns", () => {
    render(<MetricGrid metrics={mockMetrics} columns={4} />);

    const grid = document.querySelector(".grid");
    expect(grid).toHaveClass("grid-cols-1", "sm:grid-cols-2", "lg:grid-cols-4");
  });

  it("should apply correct gap classes", () => {
    render(<MetricGrid metrics={mockMetrics} gap="lg" />);

    const grid = document.querySelector(".grid");
    expect(grid).toHaveClass("gap-4");
  });

  it("should apply custom className", () => {
    render(<MetricGrid metrics={mockMetrics} className="custom-grid" />);

    const grid = document.querySelector(".grid");
    expect(grid).toHaveClass("custom-grid");
  });

  it("should pass props to MetricCard components", () => {
    render(<MetricGrid metrics={mockMetrics} />);

    expect(screen.getByText("Presentes")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });
});

describe("useTeamMetrics", () => {
  it("should create correct metrics for team status", () => {
    const onPresentClick = vi.fn();
    const onAnomaliesClick = vi.fn();

    const { result } = renderHook(() => useTeamMetrics(5, 10, 2, onPresentClick, onAnomaliesClick));

    expect(result.current).toHaveLength(3);

    // Presentes metric
    expect(result.current[0]).toEqual({
      title: "Presentes",
      value: 5,
      indicatorColor: "emerald",
      className: "cursor-pointer",
      onClick: onPresentClick,
      clickable: true,
    });

    // Total metric
    expect(result.current[1]).toEqual({
      title: "Plantilla",
      value: 10,
      indicatorColor: "slate",
    });

    // Anomalías metric
    expect(result.current[2]).toEqual({
      title: "Anomalías",
      value: 2,
      indicatorColor: "orange",
      className: "cursor-pointer",
      onClick: onAnomaliesClick,
      clickable: true,
    });
  });

  it("should handle zero presents correctly", () => {
    const onPresentClick = vi.fn();

    const { result } = renderHook(() => useTeamMetrics(0, 10, 0, onPresentClick));

    expect(result.current[0].className).toBe("");
    expect(result.current[0].onClick).toBeUndefined();
  });

  it("should handle zero anomalies correctly", () => {
    const onAnomaliesClick = vi.fn();

    const { result } = renderHook(() => useTeamMetrics(5, 10, 0, undefined, onAnomaliesClick));

    expect(result.current[2].className).toBe("");
    expect(result.current[2].onClick).toBeUndefined();
  });

  it("should handle undefined click handlers", () => {
    const { result } = renderHook(() => useTeamMetrics(5, 10, 2));

    expect(result.current[0].onClick).toBeUndefined();
    expect(result.current[2].onClick).toBeUndefined();
  });
});
