import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ConfigurationView } from "../../../features/configuration/views/Configuration.view";

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

vi.mock("../../../features/configuration/components/GlobalVariablesView", () => ({
  default: () => <div>GLOBAL-VARS-CONTENT</div>,
}));

vi.mock("../../../features/configuration/components/EmailCenterView", () => ({
  default: () => <div>EMAIL-CONTENT</div>,
}));

vi.mock("../../../features/configuration/components/MasterDataExportView", () => ({
  default: () => <div>MASTER-DATA-CONTENT</div>,
}));

describe("ConfigurationView", () => {
  it("renders tabs and delegates tab selection", async () => {
    const handleTabChange = vi.fn();

    render(<ConfigurationView activeTab="variables" handleTabChange={handleTabChange} />);

    expect(screen.getByText("Control de Sistema")).toBeInTheDocument();
    expect(screen.getByText("Variables Globales")).toBeInTheDocument();
    expect(screen.getByText("Centro de Correos")).toBeInTheDocument();
    expect(screen.getByText("Exportación de Datos")).toBeInTheDocument();
    expect(await screen.findByText("GLOBAL-VARS-CONTENT")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Centro de Correos"));
    expect(handleTabChange).toHaveBeenCalledWith("email");
  });

  it("renders the tab-specific lazy content", async () => {
    const noop = vi.fn();

    const { rerender } = render(<ConfigurationView activeTab="email" handleTabChange={noop} />);
    expect(await screen.findByText("EMAIL-CONTENT")).toBeInTheDocument();

    rerender(<ConfigurationView activeTab="master-data" handleTabChange={noop} />);
    expect(await screen.findByText("MASTER-DATA-CONTENT")).toBeInTheDocument();
  });
});
