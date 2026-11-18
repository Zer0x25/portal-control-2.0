import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CommunicationsView } from "../../../features/communications/views/Communications.view";

describe("CommunicationsView", () => {
  const baseProps: React.ComponentProps<typeof CommunicationsView> = {
    content: "<p>Comunicado activo</p>",
    safeContent: "<p>Comunicado activo</p>",
    isLoading: false,
    isSaving: false,
    isEditing: false,
    isAdmin: true,
    setContent: vi.fn(),
    setIsEditing: vi.fn(),
    handleSave: vi.fn(),
    handleDiscard: vi.fn(),
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

  it("disables publish button while saving and calls handleDiscard on discard", () => {
    const handleDiscard = vi.fn();
    render(
      <CommunicationsView
        {...baseProps}
        isEditing={true}
        isSaving={true}
        handleDiscard={handleDiscard}
      />,
    );

    expect(screen.getByRole("button", { name: /Publicar Cambios/i })).toBeDisabled();

    render(
      <CommunicationsView
        {...baseProps}
        isEditing={true}
        isSaving={false}
        handleDiscard={handleDiscard}
      />,
    );

    const discardButtons = screen.getAllByRole("button", { name: /Descartar/i });
    fireEvent.click(discardButtons[1]);
    expect(handleDiscard).toHaveBeenCalledTimes(1);
  });
});
