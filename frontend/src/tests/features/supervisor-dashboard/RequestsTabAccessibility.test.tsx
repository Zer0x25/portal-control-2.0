import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RequestsTabView from "../../../features/supervisor-dashboard/views/RequestsTab.view";
import type { RequestsTabController } from "../../../features/supervisor-dashboard/hooks/useRequestsTabController";

const props = (overrides: Partial<RequestsTabController> = {}): RequestsTabController =>
  ({
    statusFilter: "pending",
    setStatusFilter: vi.fn(),
    requestToReject: null,
    setRequestToReject: vi.fn(),
    attachmentToView: undefined,
    setAttachmentToView: vi.fn(),
    processingIds: new Set(),
    loadMoreRef: { current: null },
    stats: undefined,
    isLoadingRequests: false,
    isUpdatingRequestStatus: false,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    filteredRequests: [],
    handleApprove: vi.fn(),
    handleReject: vi.fn(),
    handleConfirmReject: vi.fn(),
    getEmployeeName: vi.fn(),
    ...overrides,
  }) as unknown as RequestsTabController;

describe("Accesibilidad de solicitudes", () => {
  it("anuncia la carga inicial", () => {
    render(<RequestsTabView {...props({ isLoadingRequests: true })} />);
    expect(screen.getByRole("status")).toHaveTextContent("Auditando bandeja de entrada");
  });

  it("expone el filtro seleccionado y el estado vacío", () => {
    const setStatusFilter = vi.fn();
    render(<RequestsTabView {...props({ setStatusFilter })} />);
    expect(screen.getByRole("button", { name: /Pendiente/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const approved = screen.getByRole("button", { name: /Aprobada/ });
    expect(approved).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(approved);
    expect(setStatusFilter).toHaveBeenCalledWith("approved");
    expect(screen.getByText("AUDITADO. SIN PENDIENTES.")).toBeInTheDocument();
  });

  it("anuncia la carga de la página siguiente", () => {
    render(<RequestsTabView {...props({ isFetchingNextPage: true })} />);
    expect(screen.getByRole("status")).toHaveTextContent("SINCRONIZANDO MÁS ENTREGAS");
  });
});
