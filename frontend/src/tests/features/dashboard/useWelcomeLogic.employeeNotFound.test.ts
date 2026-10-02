import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useWelcomeLogic } from "../../../features/dashboard/hooks/useWelcomeLogic";

// Mocks específicos para el caso donde no se encuentra empleado
vi.mock("../../../hooks/useUsers", () => ({
  useUsers: () => ({
    users: [{ username: "testuser", employeeId: "EMP001" }],
  }),
}));

vi.mock("../../../hooks/useEmployees", () => ({
  useEmployees: () => ({
    getEmployeeById: () => null, // No encuentra empleado
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

describe("useWelcomeLogic - employee not found", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return username when employee not found", () => {
    const { result } = renderHook(() => useWelcomeLogic());

    expect(result.current.welcomeName).toBe("testuser");
  });
});
