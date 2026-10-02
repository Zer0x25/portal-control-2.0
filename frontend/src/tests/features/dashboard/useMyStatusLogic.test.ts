import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMyStatusLogic } from "../../../features/dashboard/hooks/useMyStatusLogic";

// Mock de hooks
const { mockUseUserClockingStatus, mockUseReportsQuery, mockUseControlInternoEnabledQuery } =
  vi.hoisted(() => ({
    mockUseUserClockingStatus: vi.fn(() => ({
      status: "in",
      time: "08:30",
    })),
    mockUseReportsQuery: vi.fn(() => ({
      data: [
        {
          id: "shift1",
          status: "open",
          responsibleUser: "admin",
        },
      ],
    })),
    mockUseControlInternoEnabledQuery: vi.fn(() => ({ data: true })),
  }));

vi.mock("../../../hooks/useUsers", () => ({
  useUsers: () => ({
    users: [
      { username: "testuser", employeeId: "EMP001" },
      { username: "admin", employeeId: "EMP002" },
    ],
  }),
}));

vi.mock("../../../hooks/useEmployees", () => ({
  useEmployees: () => ({
    getEmployeeById: (id: string) => {
      if (id === "EMP001") return { name: "Juan Pérez" };
      if (id === "EMP002") return { name: "Admin User" };
      return null;
    },
  }),
}));

vi.mock("../../../hooks/queries/useConfigQuery", () => ({
  useControlInternoEnabledQuery: mockUseControlInternoEnabledQuery,
}));

vi.mock("../../../hooks/queries/useTimeRecordsQuery", () => ({
  useUserClockingStatus: mockUseUserClockingStatus,
}));

vi.mock("../../../hooks/queries/useReportsQuery", () => ({
  useReportsQuery: mockUseReportsQuery,
}));

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => ({
    currentUser: {
      username: "testuser",
      employeeId: "EMP001",
    },
  }),
}));

// Mock de iconos
vi.mock("../../../components/ui/icons/index", () => ({
  CheckCircleIcon: () => "CheckCircleIcon",
  MinusCircleIcon: () => "MinusCircleIcon",
}));

describe("useMyStatusLogic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseControlInternoEnabledQuery.mockReturnValue({ data: true });
    mockUseUserClockingStatus.mockReturnValue({
      status: "in",
      time: "08:30",
    });
    mockUseReportsQuery.mockReturnValue({
      data: [
        {
          id: "shift1",
          status: "open",
          responsibleUser: "admin",
        },
      ],
    });
  });

  it("should return correct status for user in shift", () => {
    const { result } = renderHook(() => useMyStatusLogic());

    expect(result.current.currentStatus).toEqual({
      text: "En Turno",
      icon: expect.any(Object), // React element
      variant: "success",
      textColor: "text-emerald-700 dark:text-emerald-400",
      borderColor: "border-emerald-500/20",
    });
    expect(result.current.timeText).toBe("Desde las 08:30");
    expect(result.current.showActiveShift).toBe(true);
    expect(result.current.responsibleName).toBe("Admin User");
  });

  it("should return correct status for user out of shift", () => {
    mockUseUserClockingStatus.mockReturnValue({
      status: "out",
      time: "17:45",
    });

    const { result } = renderHook(() => useMyStatusLogic());

    expect(result.current.currentStatus.text).toBe("Fuera de Turno");
    expect(result.current.currentStatus.variant).toBe("danger");
    expect(result.current.timeText).toBe("Último registro: 17:45");
  });

  it("should handle not employee status", () => {
    mockUseUserClockingStatus.mockReturnValue({
      status: "not_employee",
      time: "",
    });

    const { result } = renderHook(() => useMyStatusLogic());

    expect(result.current.currentStatus.text).toBe("Sin Perfil");
    expect(result.current.currentStatus.variant).toBe("neutral");
  });

  it("should handle unknown status", () => {
    mockUseUserClockingStatus.mockReturnValue({
      status: "unknown_status" as any,
      time: "",
    });

    const { result } = renderHook(() => useMyStatusLogic());

    expect(result.current.currentStatus.text).toBe("Desconocido");
    expect(result.current.currentStatus.variant).toBe("neutral");
  });

  it("should get responsible display name correctly", () => {
    const { result } = renderHook(() => useMyStatusLogic());

    // Access private method through result for testing
    // This tests the internal getResponsibleDisplayName function
    expect(result.current.responsibleName).toBe("Admin User");
  });

  it("should not show active shift when control interno disabled", () => {
    mockUseControlInternoEnabledQuery.mockReturnValue({
      data: false,
    });

    const { result } = renderHook(() => useMyStatusLogic());

    expect(result.current.showActiveShift).toBe(false);
  });

  it("should handle no active shift", () => {
    mockUseReportsQuery.mockReturnValue({
      data: [],
    });

    const { result } = renderHook(() => useMyStatusLogic());

    expect(result.current.showActiveShift).toBe(false);
    expect(result.current.responsibleName).toBe("");
  });

  it("should handle closed shift", () => {
    mockUseReportsQuery.mockReturnValue({
      data: [
        {
          id: "shift1",
          status: "closed",
          responsibleUser: "admin",
        },
      ],
    });

    const { result } = renderHook(() => useMyStatusLogic());

    expect(result.current.showActiveShift).toBe(false);
  });

  it("should return control interno enabled status", () => {
    const { result } = renderHook(() => useMyStatusLogic());

    expect(result.current.isControlInternoEnabled).toBe(true);
  });
});
