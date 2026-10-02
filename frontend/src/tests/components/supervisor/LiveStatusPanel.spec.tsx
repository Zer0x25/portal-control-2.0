import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import LiveStatusPanel from "../../../features/supervisor-dashboard/components/LiveStatusPanel";
import { ClockingStatus, Employee } from "../../../types";

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 70,
    getVirtualItems: () =>
      Array.from({ length: count }).map((_, index) => ({
        key: `row-${index}`,
        index,
        size: 70,
        start: index * 70,
      })),
  }),
}));

// Mock de Framer Motion
vi.mock("framer-motion", () => {
  const actual = vi.importActual("framer-motion");
  return {
    ...actual,
    motion: new Proxy(
      {},
      {
        get: (_target, key) => {
          return ({ children, ...props }: any) => {
            const Tag = key as any;
            return <Tag {...props}>{children}</Tag>;
          };
        },
      },
    ),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

describe("LiveStatusPanel Component", () => {
  const mockEmployees: { employee: Employee; status: ClockingStatus }[] = [
    {
      employee: {
        id: "1",
        name: "JUAN PEREZ",
        position: "OPERADOR",
        area: "LOGISTICA",
        status: "Activo",
      } as any,
      status: "en_jornada",
    },
    {
      employee: {
        id: "2",
        name: "MARIA GARCIA",
        position: "SUPERVISOR",
        area: "ADMIN",
        status: "Activo",
      } as any,
      status: "fuera",
    },
    {
      employee: {
        id: "3",
        name: "PEDRO SOTO",
        position: "OPERADOR",
        area: "LOGISTICA",
        status: "Activo",
      } as any,
      status: "en_colacion",
    },
  ];

  const defaultProps = {
    selectedStatuses: ["all"],
    onStatusesChange: vi.fn(),
    employeesWithStatus: mockEmployees,
    onEmployeeClick: vi.fn(),
  };

  it("should render the list of employees", () => {
    render(<LiveStatusPanel {...defaultProps} />);
    expect(screen.getByText("JUAN PEREZ")).toBeInTheDocument();
    expect(screen.getByText("MARIA GARCIA")).toBeInTheDocument();
    expect(screen.getByText("PEDRO SOTO")).toBeInTheDocument();
  });

  it("should filter employees by name", () => {
    render(<LiveStatusPanel {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/Filtrar por nombre.../i);

    fireEvent.change(searchInput, { target: { value: "Maria" } });

    expect(screen.getByText("MARIA GARCIA")).toBeInTheDocument();
    expect(screen.queryByText("JUAN PEREZ")).not.toBeInTheDocument();
  });

  it("should filter employees by status based on selectedStatuses prop", () => {
    const props = { ...defaultProps, selectedStatuses: ["en_jornada"] };
    render(<LiveStatusPanel {...props} />);

    expect(screen.getByText("JUAN PEREZ")).toBeInTheDocument();
    expect(screen.queryByText("MARIA GARCIA")).not.toBeInTheDocument();
    expect(screen.queryByText("PEDRO SOTO")).not.toBeInTheDocument();
  });

  it("should call onStatusesChange with ['all'] when clicking 'Limpiar Parámetros'", () => {
    const props = { ...defaultProps, selectedStatuses: ["en_jornada"] };
    render(<LiveStatusPanel {...props} />);

    const clearBtn = screen.getByText(/Limpiar Parámetros/i);
    fireEvent.click(clearBtn);

    expect(defaultProps.onStatusesChange).toHaveBeenCalledWith(["all"]);
  });

  it("should call onEmployeeClick when an employee row is clicked", () => {
    render(<LiveStatusPanel {...defaultProps} />);
    const employeeRow = screen.getByText("JUAN PEREZ");
    fireEvent.click(employeeRow);

    expect(defaultProps.onEmployeeClick).toHaveBeenCalledWith(mockEmployees[0].employee);
  });

  it("should show empty state message when no employees match filters", () => {
    render(<LiveStatusPanel {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/Filtrar por nombre.../i);

    fireEvent.change(searchInput, { target: { value: "Inexistente" } });

    expect(screen.getByText(/Sin coincidencias operativas/i)).toBeInTheDocument();
  });
});
