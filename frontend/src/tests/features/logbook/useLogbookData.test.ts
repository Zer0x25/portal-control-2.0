import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useLogbookData } from "../../../features/logbook/hooks/useLogbookData";

const { navigateMock, setSearchParamsMock, startNewShiftMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  setSearchParamsMock: vi.fn(),
  startNewShiftMock: vi.fn(async () => undefined),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearchParams: () => [new URLSearchParams("id=r1"), setSearchParamsMock],
  };
});

vi.mock("../../../hooks/queries/useReportsQuery", () => ({
  useReportsQuery: () => ({
    data: [
      {
        id: "r1",
        folio: "101",
        date: "2026-03-03",
        shiftName: "Turno Día",
        responsibleUser: "admin",
        startTime: "2026-03-03T08:00:00.000Z",
        status: "open",
        logEntries: [],
        supplierEntries: [],
        reportCreatedAt: "2026-03-03T08:00:00.000Z",
        updatedAt: "2026-03-03T08:00:00.000Z",
        lastModified: 0,
        syncStatus: "synced",
        isDeleted: false,
      },
    ],
    refetch: vi.fn(),
    isLoading: false,
  }),
}));

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => ({
    currentUser: {
      id: "u1",
      username: "admin",
      role: "Administrador",
      employeeId: "e1",
      lastModified: 0,
      syncStatus: "synced",
      isDeleted: false,
    },
    logout: vi.fn(),
  }),
}));

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: vi.fn() }),
}));

vi.mock("../../../hooks/useEmployees", () => ({
  useEmployees: () => ({
    getEmployeeById: (id: string) => (id === "e1" ? { id: "e1", name: "Ana Pérez" } : null),
  }),
}));

vi.mock("../../../hooks/useUsers", () => ({
  useUsers: () => ({
    users: [
      {
        id: "u1",
        username: "admin",
        employeeId: "e1",
        role: "Administrador",
        lastModified: 0,
        syncStatus: "synced",
        isDeleted: false,
      },
    ],
  }),
}));

vi.mock("../../../hooks/useShiftManager", () => ({
  useShiftManager: () => ({ startNewShift: startNewShiftMock }),
}));

vi.mock("../../../hooks/useTimeRecords", () => ({
  useTimeRecords: () => ({ punch: vi.fn() }),
}));

vi.mock("../../../hooks/useMediaQuery", () => ({
  useMediaQuery: () => false,
}));

vi.mock("../../../services/shiftReportService", () => ({
  shiftReportService: {
    getAll: vi.fn(async () => ({ data: [] })),
    save: vi.fn(async () => undefined),
  },
}));

describe("useLogbookData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves responsible employee display name", () => {
    const { result } = renderHook(() => useLogbookData());

    expect(result.current.getResponsibleDisplayName("admin")).toBe("Ana Pérez");
    expect(result.current.getResponsibleDisplayName("unknown")).toBe("unknown");
  });

  it("handles start shift and close report details query cleanup", async () => {
    const { result } = renderHook(() => useLogbookData());

    await act(async () => {
      await result.current.handleStartShift();
    });

    expect(startNewShiftMock).toHaveBeenCalled();
    expect(result.current.isStartingShift).toBe(false);

    act(() => {
      result.current.handleOpenReportDetails({
        id: "r1",
        folio: "101",
        date: "2026-03-03",
        shiftName: "Turno Día",
        responsibleUser: "admin",
        startTime: "2026-03-03T08:00:00.000Z",
        status: "open",
        logEntries: [],
        supplierEntries: [],
        reportCreatedAt: "2026-03-03T08:00:00.000Z",
        updatedAt: "2026-03-03T08:00:00.000Z",
        lastModified: 0,
        syncStatus: "synced",
        isDeleted: false,
      } as never);
    });

    act(() => {
      result.current.handleCloseReportDetails();
    });

    expect(setSearchParamsMock).toHaveBeenCalled();
  });
});
