import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useWelcomeLogic } from "../../../features/dashboard/hooks/useWelcomeLogic";

// Mock de las dependencias
vi.mock("../../../hooks/useUsers", () => ({
  useUsers: () => ({
    users: [{ username: "testuser", employeeId: "EMP001" }],
  }),
}));

vi.mock("../../../hooks/useEmployees", () => ({
  useEmployees: () => ({
    getEmployeeById: (id: string) => (id === "EMP001" ? { name: "Juan Pérez" } : null),
  }),
}));

vi.mock("../../../hooks/useWeather", () => ({
  useWeather: () => ({
    weather: {
      location: "Buenos Aires",
      temperature: 25,
      condition: "Sunny" as const,
      uvIndex: 7,
    },
    isLoading: false,
  }),
}));

vi.mock("../../../store/useStore", () => ({
  useStore: (selector: any) =>
    selector({
      currentUser: {
        username: "testuser",
        employeeId: "EMP001",
      },
    }),
}));

describe("useWelcomeLogic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return welcome data with employee name", () => {
    const { result } = renderHook(() => useWelcomeLogic());

    expect(result.current).toEqual({
      weather: {
        location: "Buenos Aires",
        temperature: 25,
        condition: "Sunny",
        uvIndex: 7,
      },
      isLoadingWeather: false,
      welcomeName: "Juan Pérez",
      greeting: expect.any(String),
    });
  });

  it("should return appropriate greeting based on time", () => {
    const mockDate = new Date("2024-01-01T10:00:00"); // 10 AM
    vi.setSystemTime(mockDate);

    const { result } = renderHook(() => useWelcomeLogic());

    expect(result.current.greeting).toBe("Buenos días");

    vi.restoreAllMocks();
  });

  it("should return evening greeting", () => {
    const mockDate = new Date("2024-01-01T15:00:00"); // 3 PM
    vi.setSystemTime(mockDate);

    const { result } = renderHook(() => useWelcomeLogic());

    expect(result.current.greeting).toBe("Buenas tardes");

    vi.restoreAllMocks();
  });

  it("should return night greeting", () => {
    const mockDate = new Date("2024-01-01T22:00:00"); // 10 PM
    vi.setSystemTime(mockDate);

    const { result } = renderHook(() => useWelcomeLogic());

    expect(result.current.greeting).toBe("Buenas noches");

    vi.restoreAllMocks();
  });
});
