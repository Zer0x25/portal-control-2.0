import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AddNoveltyModal from "../../../features/logbook/components/AddNoveltyModal.container";
import AddSupplierModal from "../../../features/logbook/components/AddSupplierModal.container";
import SupplierEntriesCard from "../../../features/logbook/components/SupplierEntriesCard";
import type { ShiftReport } from "../../../types/index";

const { addToast } = vi.hoisted(() => ({ addToast: vi.fn() }));
vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => ({ currentUser: { id: "user-1", username: "guard" } }),
}));
vi.mock("../../../hooks/useToasts", () => ({ useToasts: () => ({ addToast }) }));
vi.mock("../../../hooks/useMediaQuery", () => ({ useMediaQuery: () => false }));

const shift: ShiftReport = {
  id: "shift-1",
  folio: "12",
  date: "2026-01-01",
  shiftName: "Día",
  responsibleUser: "guard",
  startTime: "2026-01-01T08:00:00.000Z",
  status: "open",
  logEntries: [],
  supplierEntries: [],
  reportCreatedAt: "2026-01-01T08:00:00.000Z",
  updatedAt: "2026-01-01T08:00:00.000Z",
  lastModified: 0,
  syncStatus: "synced",
  isDeleted: false,
};

const enter = (element: HTMLElement) => {
  const event = new KeyboardEvent("keydown", {
    key: "Enter",
    code: "Enter",
    bubbles: true,
    cancelable: true,
  });
  act(() => element.dispatchEvent(event));
  return event.defaultPrevented;
};

describe("compact logbook entry modals", () => {
  it("keeps Enter as a newline in the novelty details", () => {
    const onSave = vi.fn();
    render(
      <AddNoveltyModal
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        isEditing={false}
        initialTime="08:30"
      />,
    );

    const details = screen.getByRole("textbox", { name: "Detalle de la anotación" });
    fireEvent.change(details, { target: { value: "Primera línea\nSegunda línea" } });
    expect(enter(details)).toBe(false);
    expect(details).toHaveValue("Primera línea\nSegunda línea");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("offers visit/provider and pedestrian/vehicle choices and only shows plate for vehicles", () => {
    render(<AddSupplierModal isOpen onClose={vi.fn()} onSave={vi.fn()} isEditing={false} />);

    expect(screen.getByRole("radio", { name: "Visita" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "A pie" })).toBeChecked();
    expect(screen.queryByLabelText("Patente")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Proveedor" }));
    fireEvent.click(screen.getByRole("radio", { name: "En vehículo" }));
    expect(screen.getByRole("radio", { name: "Proveedor" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "En vehículo" })).toBeChecked();
    expect(screen.getByLabelText("Patente")).toBeInTheDocument();
  });

  it("uses Enter to advance through supplier fields and keeps Enter in the reason", () => {
    const onSave = vi.fn();
    render(<AddSupplierModal isOpen onClose={vi.fn()} onSave={onSave} isEditing={false} />);
    const visit = screen.getByRole("radio", { name: "Visita" });
    const pedestrian = screen.getByRole("radio", { name: "A pie" });
    const vehicle = screen.getByRole("radio", { name: "En vehículo" });
    const time = screen.getByRole("button", { name: "Hora de ingreso" });

    visit.focus();
    expect(enter(visit)).toBe(true);
    expect(document.activeElement).toBe(pedestrian);

    expect(enter(pedestrian)).toBe(true);
    expect(document.activeElement).toBe(time);

    vehicle.focus();
    expect(enter(vehicle)).toBe(true);
    expect(document.activeElement).toBe(time);
    const plate = screen.getByLabelText("Patente");
    const name = screen.getByLabelText("Nombre / responsable");
    const company = screen.getByLabelText("Empresa / entidad");
    const reason = screen.getByRole("textbox", { name: "Motivo del ingreso" });
    const paxCount = screen.getByLabelText("Pasajeros extra");
    const submitButton = screen.getByRole("button", { name: "Guardar registro" });

    plate.focus();
    expect(enter(plate)).toBe(true);
    expect(document.activeElement).toBe(name);
    expect(enter(name)).toBe(true);
    expect(document.activeElement).toBe(company);
    expect(enter(company)).toBe(true);
    expect(document.activeElement).toBe(reason);
    fireEvent.change(reason, { target: { value: "Entrega\nMantenimiento" } });
    expect(enter(reason)).toBe(false);
    expect(reason).toHaveValue("Entrega\nMantenimiento");

    paxCount.focus();
    expect(enter(paxCount)).toBe(true);
    expect(document.activeElement).toBe(submitButton);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("renders pedestrian and visit/provider labels without an empty plate badge", () => {
    render(
      <SupplierEntriesCard
        activeShift={{
          ...shift,
          supplierEntries: [
            {
              id: "ped-1",
              entryType: "visit",
              arrivalMode: "pedestrian",
              time: "09:15",
              licensePlate: "",
              driverName: "Ana López",
              paxCount: 0,
              company: "Consultora",
              reason: "Reunión",
              timestamp: 1,
            },
          ],
        }}
        onUpdateShift={vi.fn()}
        showSupplierEntryModal={false}
        setShowSupplierEntryModal={vi.fn()}
      />,
    );

    expect(screen.getByText("Visita")).toBeInTheDocument();
    expect(screen.getByText("A pie")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Editar visita: Consultora (a pie, 09:15)" }),
    ).toBeInTheDocument();
  });

  it("persists selected classifications and passenger count through the supplier entry save path", async () => {
    const onUpdateShift = vi.fn().mockResolvedValue(undefined);
    render(
      <SupplierEntriesCard
        activeShift={shift}
        onUpdateShift={onUpdateShift}
        showSupplierEntryModal={true}
        setShowSupplierEntryModal={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Proveedor" }));
    fireEvent.click(screen.getByRole("radio", { name: "En vehículo" }));
    fireEvent.change(screen.getByLabelText("Patente"), { target: { value: "ab12cd" } });
    fireEvent.change(screen.getByLabelText("Nombre / responsable"), {
      target: { value: "María Pérez" },
    });
    fireEvent.change(screen.getByLabelText("Empresa / entidad"), {
      target: { value: "Servicios Sur" },
    });
    fireEvent.change(screen.getByLabelText("Pasajeros extra"), { target: { value: "2" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Motivo del ingreso" }), {
      target: { value: "Mantención" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar registro" }));
    await waitFor(() => expect(onUpdateShift).toHaveBeenCalledTimes(1));
    const saved = onUpdateShift.mock.calls[0][0] as ShiftReport;
    expect(saved.supplierEntries[0]).toMatchObject({
      entryType: "provider",
      arrivalMode: "vehicle",
      licensePlate: "AB-12-CD",
      paxCount: 2,
    });
  });
});
