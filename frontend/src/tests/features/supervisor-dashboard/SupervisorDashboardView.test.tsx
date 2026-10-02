import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SupervisorDashboardView } from "../../../features/supervisor-dashboard/views/SupervisorDashboard.view";

const FakeIcon = ({ className }: { className?: string }) => <span className={className}>I</span>;

describe("SupervisorDashboardView", () => {
  it("renders tabs and delegates tab click", () => {
    const handleTabClick = vi.fn();

    render(
      <SupervisorDashboardView
        activeTab="overview"
        tabs={[
          { id: "overview", label: "Resumen", icon: FakeIcon },
          { id: "kpis", label: "KPIs", icon: FakeIcon, badge: 2 },
        ]}
        handleTabClick={handleTabClick}
        renderContent={() => <div>SUPERVISOR-CONTENT</div>}
      />,
    );

    expect(screen.getByText("Control y Supervisión")).toBeInTheDocument();
    expect(screen.getByText("SUPERVISOR-CONTENT")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /KPIs/i }));
    expect(handleTabClick).toHaveBeenCalledWith("kpis");
  });
});
