import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CommunicationsView } from "../../../features/communications/views/Communications.view";

describe("CommunicationsView", () => {
  const baseProps: React.ComponentProps<typeof CommunicationsView> = {
    content: "<p>Comunicado activo</p>",
    isLoading: false,
    isEditing: false,
    isAdmin: true,
    setContent: vi.fn(),
    setIsEditing: vi.fn(),
    handleSave: vi.fn(),
  };

  it("renders content and enables edit for admin", () => {
    render(<CommunicationsView {...baseProps} />);

    expect(screen.getByText("Comunicados Internos")).toBeInTheDocument();
    expect(screen.getByTestId("page-container")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Editar Comunicado/i }));
    expect(baseProps.setIsEditing).toHaveBeenCalledWith(true);
  });

  it("shows loading state", () => {
    render(<CommunicationsView {...baseProps} isLoading={true} />);
    expect(screen.getByText("Sincronizando comunicados...")).toBeInTheDocument();
  });
});
