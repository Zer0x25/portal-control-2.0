import { render, screen, fireEvent, waitFor, renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ClockingPanel from "../../../features/time-control/components/ClockingPanel";
import { useClockingEmployeeOptionsQuery } from "../../../hooks/queries/useEmployeesQuery";
import {
  useTimeRecordsQuery,
  useTimeRecordMutations,
} from "../../../hooks/queries/useTimeRecordsQuery";
import { useAuth } from "../../../hooks/useAuth";
import { useToasts } from "../../../hooks/useToasts";
import { useClockingPanel } from "../../../features/time-control/hooks/useClockingPanel";

const { normalizeStringMock } = vi.hoisted(() => ({
  normalizeStringMock: vi.fn(
    (value: string | undefined | null) =>
      value?.normalize("NFD").replace(/[\u0300-\u036f]/g, "") ?? "",
  ),
}));

// Mock de los hooks
vi.mock("../../../hooks/queries/useEmployeesQuery", () => ({
  useClockingEmployeeOptionsQuery: vi.fn(),
}));
vi.mock("../../../utils/stringUtils", () => ({ normalizeString: normalizeStringMock }));
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
    { id: "3", name: "José Álvarez", area: "Administración", status: "Activo" },
  ];

  const mockCurrentUser = { id: "admin-1", username: "admin", role: "Administrador" };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useClockingEmployeeOptionsQuery).mockReturnValue({
      data: mockActiveEmployees,
    } as ReturnType<typeof useClockingEmployeeOptionsQuery>);

    vi.mocked(useTimeRecordsQuery).mockReturnValue({
      data: { pages: [{ data: [] }] },
      isLoading: false,
    } as ReturnType<typeof useTimeRecordsQuery>);

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
    expect(useTimeRecordsQuery).toHaveBeenCalledWith({
      pageSize: 5,
      enabled: false,
      filters: { desde: "", hasta: "", employeeId: undefined },
    });
  });

  it("skips deriving search results while the search is empty", () => {
    render(<ClockingPanel isActionDisabled={false} roleBasedTooltip="" />);
    expect(normalizeStringMock).not.toHaveBeenCalled();
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

  it("keeps accent-insensitive employee search", () => {
    render(<ClockingPanel isActionDisabled={false} roleBasedTooltip="" />);
    const input = screen.getByPlaceholderText(/Buscar empleado/i);

    fireEvent.change(input, { target: { value: "jose" } });

    expect(screen.getByText("José Álvarez")).toBeInTheDocument();
  });

  it("sorts matching employee results alphabetically", () => {
    const { result } = renderHook(() => useClockingPanel());

    act(() => result.current.setSearchTerm("a"));

    expect(result.current.filteredEmployees.map((employee) => employee.name)).toEqual([
      "José Álvarez",
      "Juan Perez",
      "Maria Garcia",
    ]);
  });

  it("blocks overlapping manual clock actions while the first mutation is pending", async () => {
    let resolveMutation: (value: { success: boolean; action: string }) => void = () => undefined;
    mockMutateAsync.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMutation = resolve;
        }),
    );

    const { result } = renderHook(() => useClockingPanel());
    act(() => result.current.setSelectedEmployeeId("1"));

    await act(async () => {
      const firstAttempt = result.current.performActionAndReset("jornada_inicio");
      const secondAttempt = result.current.performActionAndReset("jornada_inicio");

      expect(mockMutateAsync).toHaveBeenCalledTimes(1);

      resolveMutation({ success: true, action: "ENTRADA" });
      await Promise.all([firstAttempt, secondAttempt]);
    });

    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
  });

  it("should select an employee and enable the 'Inicio' button", async () => {
    render(<ClockingPanel isActionDisabled={false} roleBasedTooltip="" />);
    const input = screen.getByPlaceholderText(/Buscar empleado/i);

    fireEvent.change(input, { target: { value: "Juan" } });
    const employeeOption = await screen.findByText(/JUAN PEREZ/i);
    const normalizationCallsBeforeSelection = normalizeStringMock.mock.calls.length;
    fireEvent.click(employeeOption);

    expect(normalizeStringMock).toHaveBeenCalledTimes(normalizationCallsBeforeSelection);

    await waitFor(() => {
      expect(screen.getByText(/Fuera de Jornada/i)).toBeInTheDocument();
    });
    expect(useTimeRecordsQuery).toHaveBeenLastCalledWith({
      pageSize: 5,
      enabled: true,
      filters: { desde: "", hasta: "", employeeId: "1" },
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
