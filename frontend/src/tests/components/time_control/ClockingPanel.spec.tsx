import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ClockingPanel from "../../../features/time-control/components/ClockingPanel";
import { useEmployees } from "../../../hooks/useEmployees";
import { useTimeRecords } from "../../../hooks/useTimeRecords";
import { useTimeRecordMutations } from "../../../hooks/queries/useTimeRecordsQuery";
import { useAuth } from "../../../hooks/useAuth";
import { useToasts } from "../../../hooks/useToasts";

// Mock de los hooks
vi.mock("../../../hooks/useEmployees");
vi.mock("../../../hooks/useTimeRecords");
vi.mock("../../../hooks/queries/useTimeRecordsQuery");
vi.mock("../../../hooks/useAuth");
vi.mock("../../../hooks/useToasts");
vi.mock("../../../hooks/useMediaQuery", () => ({
  useMediaQuery: () => false,
}));

describe("ClockingPanel Component", () => {
  const mockAddToast = vi.fn();
  const mockMutateAsync = vi.fn();

  const mockActiveEmployees = [
    { id: "1", name: "Juan Perez", area: "Logística", status: "Activo" },
    { id: "2", name: "Maria Garcia", area: "Operaciones", status: "Activo" },
  ];

  const mockCurrentUser = { id: "admin-1", username: "admin", role: "Administrador" };

  beforeEach(() => {
    vi.clearAllMocks();

    (useEmployees as any).mockReturnValue({
      activeEmployees: mockActiveEmployees,
    });

    (useTimeRecords as any).mockReturnValue({
      timeRecordsPage: [],
      isLoadingRecords: false,
    });

    (useTimeRecordMutations as any).mockReturnValue({
      punchMutation: {
        mutateAsync: mockMutateAsync,
        isPending: false,
      },
    });

    (useAuth as any).mockReturnValue({
      currentUser: mockCurrentUser,
    });

    (useToasts as any).mockReturnValue({
      addToast: mockAddToast,
    });
  });

  it("should render searching placeholder initially", () => {
    render(<ClockingPanel isActionDisabled={false} roleBasedTooltip="" />);
    expect(screen.getByPlaceholderText(/Buscar empleado/i)).toBeInTheDocument();
    expect(screen.getByText(/Seleccione un empleado/i)).toBeInTheDocument();
  });

  it("should show results when typing in search input", async () => {
    render(<ClockingPanel isActionDisabled={false} roleBasedTooltip="" />);
    const input = screen.getByPlaceholderText(/Buscar empleado/i);

    fireEvent.change(input, { target: { value: "Juan" } });

    await waitFor(() => {
      expect(screen.getByText(/JUAN PEREZ/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/LOGÍSTICA/i)).toBeInTheDocument();
  });

  it("should select an employee and enable the 'Inicio' button", async () => {
    render(<ClockingPanel isActionDisabled={false} roleBasedTooltip="" />);
    const input = screen.getByPlaceholderText(/Buscar empleado/i);

    fireEvent.change(input, { target: { value: "Juan" } });
    const employeeOption = await screen.findByText(/JUAN PEREZ/i);
    fireEvent.click(employeeOption);

    await waitFor(() => {
      expect(screen.getByText(/Fuera de Jornada/i)).toBeInTheDocument();
    });

    const inicioBtn = screen.getByRole("button", { name: /^Inicio$/i });
    expect(inicioBtn).not.toBeDisabled();
  });

  it("should call mutateAsync when clicking 'Inicio'", async () => {
    mockMutateAsync.mockResolvedValue({ success: true, action: "ENTRADA" });

    render(<ClockingPanel isActionDisabled={false} roleBasedTooltip="" />);
    const input = screen.getByPlaceholderText(/Buscar empleado/i);

    // Buscar y seleccionar
    fireEvent.change(input, { target: { value: "Juan" } });
    const employeeOption = await screen.findByText(/JUAN PEREZ/i);
    fireEvent.click(employeeOption);

    // Click en Inicio
    const inicioBtn = await screen.findByRole("button", { name: /^Inicio$/i });
    fireEvent.click(inicioBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        employeeId: "1",
        source: "OPERATOR",
        forcedType: "entrada",
      });
    });

    // Verificar que se limpia el estado tras el éxito
    await waitFor(() => {
      expect(screen.getByText(/Seleccione un empleado/i)).toBeInTheDocument();
    });
  });

  it("should disable buttons if isActionDisabled is true", () => {
    render(<ClockingPanel isActionDisabled={true} roleBasedTooltip="Acción no permitida" />);
    const input = screen.getByPlaceholderText(/Búsqueda deshabilitada/i);
    expect(input).toBeDisabled();
  });
});
