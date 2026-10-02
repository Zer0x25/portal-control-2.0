import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GovernanceHubView } from "../../../features/governance/views/GovernanceHub.view";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      layoutId: _layoutId,
      ...props
    }: {
      children: React.ReactNode;
      layoutId?: string;
      [key: string]: unknown;
    }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../../../features/governance/components/IntegritySummaryView", () => ({
  default: () => <div>INTEGRITY-CONTENT</div>,
}));

vi.mock("../../../features/governance/components/SecurityInsightsView", () => ({
  default: () => <div>SECURITY-CONTENT</div>,
}));

vi.mock("../../../features/governance/components/AuditLogsView", () => ({
  default: () => <div>AUDIT-CONTENT</div>,
}));

vi.mock("../../../features/governance/components/SystemMaintenanceView", () => ({
  default: () => <div>SYSTEM-CONTENT</div>,
}));

vi.mock("../../../features/governance/components/HealthStatusView", () => ({
  default: () => <div>HEALTH-CONTENT</div>,
}));

describe("GovernanceHubView", () => {
  it("renders tabs and delegates tab selection", async () => {
    const handleTabChange = vi.fn();

    render(<GovernanceHubView activeTab="integrity" handleTabChange={handleTabChange} />);

    expect(screen.getByText("Centro de Gobernanza & Seguridad")).toBeInTheDocument();
    expect(screen.getByText("Integridad")).toBeInTheDocument();
    expect(screen.getByText("Seguridad")).toBeInTheDocument();
    expect(screen.getByText("Auditoría")).toBeInTheDocument();
    expect(screen.getByText("Mantenimiento")).toBeInTheDocument();
    expect(screen.getByText("Salud")).toBeInTheDocument();
    expect(await screen.findByText("INTEGRITY-CONTENT")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Auditoría"));
    expect(handleTabChange).toHaveBeenCalledWith("audit");
  });

  it("renders the tab-specific lazy content", async () => {
    const noop = vi.fn();
    const { rerender } = render(<GovernanceHubView activeTab="security" handleTabChange={noop} />);
    expect(await screen.findByText("SECURITY-CONTENT")).toBeInTheDocument();

    rerender(<GovernanceHubView activeTab="health" handleTabChange={noop} />);
    expect(await screen.findByText("HEALTH-CONTENT")).toBeInTheDocument();
  });
});
