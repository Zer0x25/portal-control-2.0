import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useQuickActionsLogic } from "../../../features/dashboard/hooks/useQuickActionsLogic";
import { ROUTES } from "../../../constants";

// Mock de react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock de constantes
vi.mock("../../../constants", () => ({
  ROUTES: {
    TIME_CONTROL: "/time-control",
    LOGBOOK: "/logbook",
    SHIFT_CALENDAR: "/shift-calendar",
    EMPLOYEE_MANAGEMENT: "/employees",
  },
}));

// Mock de iconos
vi.mock("../../../components/ui/icons/index", () => ({
  ClockIcon: () => "ClockIcon",
  BookOpenIcon: () => "BookOpenIcon",
  CalendarDaysIcon: () => "CalendarDaysIcon",
  UsersIcon: () => "UsersIcon",
}));

describe("useQuickActionsLogic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return correct actions configuration", () => {
    const { result } = renderHook(() => useQuickActionsLogic());

    expect(result.current.actions).toHaveLength(4);
    expect(result.current.actions[0]).toEqual({
      id: "time",
      label: "Horarios",
      icon: expect.any(Function),
      route: ROUTES.TIME_CONTROL,
      color: "emerald",
    });
  });

  it("should return all expected actions", () => {
    const { result } = renderHook(() => useQuickActionsLogic());

    const expectedActions = [
      { id: "time", label: "Horarios", route: ROUTES.TIME_CONTROL, color: "emerald" },
      { id: "log", label: "Novedades", route: ROUTES.LOGBOOK, color: "indigo" },
      { id: "cal", label: "Calendario", route: ROUTES.SHIFT_CALENDAR, color: "slate" },
      { id: "users", label: "Personal", route: ROUTES.EMPLOYEE_MANAGEMENT, color: "orange" },
    ];

    result.current.actions.forEach((action, index) => {
      expect(action.id).toBe(expectedActions[index].id);
      expect(action.label).toBe(expectedActions[index].label);
      expect(action.route).toBe(expectedActions[index].route);
      expect(action.color).toBe(expectedActions[index].color);
      expect(typeof action.icon).toBe("function");
    });
  });

  it("should return color classes mapping", () => {
    const { result } = renderHook(() => useQuickActionsLogic());

    expect(result.current.colorClasses).toEqual({
      emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
      indigo: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10",
      slate: "text-slate-600 dark:text-gray-400 bg-gray-500/10",
      orange: "text-orange-600 dark:text-orange-400 bg-orange-500/10",
    });
  });

  it("should navigate when handleNavigate is called", () => {
    const { result } = renderHook(() => useQuickActionsLogic());

    result.current.handleNavigate("/test-route");

    expect(mockNavigate).toHaveBeenCalledWith("/test-route");
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it("should handle multiple navigation calls", () => {
    const { result } = renderHook(() => useQuickActionsLogic());

    result.current.handleNavigate("/route1");
    result.current.handleNavigate("/route2");
    result.current.handleNavigate("/route3");

    expect(mockNavigate).toHaveBeenCalledTimes(3);
    expect(mockNavigate).toHaveBeenNthCalledWith(1, "/route1");
    expect(mockNavigate).toHaveBeenNthCalledWith(2, "/route2");
    expect(mockNavigate).toHaveBeenNthCalledWith(3, "/route3");
  });
});
