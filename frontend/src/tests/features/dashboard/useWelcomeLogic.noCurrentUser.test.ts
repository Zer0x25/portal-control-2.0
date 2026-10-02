import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useWelcomeLogic } from "../../../features/dashboard/hooks/useWelcomeLogic";

// Mocks específicos para el caso donde no hay usuario actual
vi.mock("../../../hooks/useUsers", () => ({
  useUsers: () => ({
    users: [],
  }),
}));

vi.mock("../../../hooks/useEmployees", () => ({
  useEmployees: () => ({
    getEmployeeById: () => null,
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
      currentUser: null, // No hay usuario actual
    }),
}));

describe("useWelcomeLogic - no current user", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 'Invitado' when no current user", () => {
    const { result } = renderHook(() => useWelcomeLogic());

    expect(result.current.welcomeName).toBe("Invitado");
  });
});
