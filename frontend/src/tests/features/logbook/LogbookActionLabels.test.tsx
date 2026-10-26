import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LogEntriesCard from "../../../features/logbook/components/LogEntriesCard";
import SupplierEntriesCard from "../../../features/logbook/components/SupplierEntriesCard";
import type { ShiftReport } from "../../../types/logbook";

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => ({ currentUser: { id: "user-1" } }),
}));

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: vi.fn() }),
}));

vi.mock("../../../features/logbook/components/AddNoveltyModal.container", () => ({
  default: () => null,
}));

vi.mock("../../../features/logbook/components/AddSupplierModal.container", () => ({
  default: () => null,
}));

const activeShift: ShiftReport = {
  id: "shift-1",
  folio: "120",
  date: "2026-10-25",
  shiftName: "Turno Mañana",
  startTime: "2026-10-25T08:00:00.000Z",
  responsibleUser: "admin",
  status: "open",
  logEntries: [
    {
      id: "log-1",
      time: "09:30",
      annotation: "Revisar filtro de aceite",
      timestamp: 1,
    },
  ],
  supplierEntries: [
    {
      id: "supplier-1",
      time: "10:15",
      licensePlate: "AB1234",
      driverName: "Juan Pérez",
      paxCount: 0,
      company: "Acme",
      reason: "Mantención programada",
      timestamp: 2,
    },
  ],
  reportCreatedAt: "2026-10-25T08:00:00.000Z",
  updatedAt: "2026-10-25T10:15:00.000Z",
  lastModified: 2,
  syncStatus: "synced",
  isDeleted: false,
};

function setMobileLayout(matches: boolean) {
  vi.mocked(window.matchMedia).mockImplementation(
    (query) =>
      ({
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as MediaQueryList,
  );
}

const layouts = [
  { name: "mobile cards", isMobile: true },
  { name: "desktop tables", isMobile: false },
] as const;

describe.each(layouts)("Logbook action names in $name", ({ isMobile }) => {
  it("names each novelty action with its record context", () => {
    setMobileLayout(isMobile);
    render(
      <LogEntriesCard
        activeShift={activeShift}
        onUpdateShift={vi.fn().mockResolvedValue(undefined)}
        showLogEntryModal={false}
        setShowLogEntryModal={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Editar novedad: Revisar filtro de aceite (09:30)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Eliminar novedad: Revisar filtro de aceite (09:30)",
      }),
    ).toBeInTheDocument();
  });

  it("names each supplier action with company, plate, and time", () => {
    setMobileLayout(isMobile);
    render(
      <SupplierEntriesCard
        activeShift={activeShift}
        onUpdateShift={vi.fn().mockResolvedValue(undefined)}
        showSupplierEntryModal={false}
        setShowSupplierEntryModal={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Editar proveedor: Acme (patente AB1234, 10:15)",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Eliminar proveedor: Acme (patente AB1234, 10:15)",
      }),
    ).toBeInTheDocument();
  });
});
