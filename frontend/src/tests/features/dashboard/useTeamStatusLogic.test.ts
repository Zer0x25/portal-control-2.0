import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTeamStatusLogic } from "../../../features/dashboard/hooks/useTeamStatusLogic";
import { DailyTimeRecord } from "../../../types";

// Mock de queries
const { mockUseDashboardOverviewQuery } = vi.hoisted(() => ({
  mockUseDashboardOverviewQuery: vi.fn(() => ({
    data: {
      teamStatus: {
        present: 5,
        total: 10,
        anomalies: [
          {
            id: "record1",
            employeeName: "Juan Pérez",
            employeePosition: "Operador",
            date: "2024-01-01",
          } as DailyTimeRecord,
        ],
        presentRecords: [
          {
            id: "record2",
            employeeName: "María García",
            employeePosition: "Supervisor",
            date: "2024-01-01",
          } as DailyTimeRecord,
        ],
      },
      unscheduledPresent: [
        {
          id: "record3",
          employeeName: "Carlos López",
          employeePosition: "Técnico",
          date: "2024-01-01",
        } as DailyTimeRecord,
      ],
    },
  })),
}));

vi.mock("../../../hooks/queries/useDashboardQueries", () => ({
  useDashboardOverviewQuery: mockUseDashboardOverviewQuery,
}));

describe("useTeamStatusLogic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return correct team status data", () => {
    const { result } = renderHook(() => useTeamStatusLogic());

    expect(result.current.teamStatus).toEqual({
      present: 5,
      total: 10,
      anomalies: expect.any(Array),
      presentRecords: expect.any(Array),
    });
  });

  it("should return unscheduled present records", () => {
    const { result } = renderHook(() => useTeamStatusLogic());

    expect(result.current.unscheduledPresent).toHaveLength(1);
    expect(result.current.unscheduledPresent[0]).toMatchObject({
      id: "record3",
      employeeName: "Carlos López",
      employeePosition: "Técnico",
    });
  });

  it("should detect unscheduled present correctly", () => {
    const { result } = renderHook(() => useTeamStatusLogic());

    expect(result.current.hasUnscheduledPresent).toBe(true);
  });

  it("should detect anomalies correctly", () => {
    const { result } = renderHook(() => useTeamStatusLogic());

    expect(result.current.hasAnomalies).toBe(true);
  });

  it("should detect present employees correctly", () => {
    const { result } = renderHook(() => useTeamStatusLogic());

    expect(result.current.hasPresent).toBe(true);
  });

  it("should handle no unscheduled present", () => {
    mockUseDashboardOverviewQuery.mockReturnValue({
      data: {
        teamStatus: {
          present: 5,
          total: 10,
          anomalies: [],
          presentRecords: [],
        },
        unscheduledPresent: [],
      },
    });

    const { result } = renderHook(() => useTeamStatusLogic());

    expect(result.current.hasUnscheduledPresent).toBe(false);
    expect(result.current.unscheduledPresent).toEqual([]);
  });

  it("should handle no anomalies", () => {
    mockUseDashboardOverviewQuery.mockReturnValue({
      data: {
        teamStatus: {
          present: 5,
          total: 10,
          anomalies: [],
          presentRecords: [],
        },
        unscheduledPresent: [],
      },
    });

    const { result } = renderHook(() => useTeamStatusLogic());

    expect(result.current.hasAnomalies).toBe(false);
    expect(result.current.teamStatus.anomalies).toEqual([]);
  });

  it("should handle no present employees", () => {
    mockUseDashboardOverviewQuery.mockReturnValue({
      data: {
        teamStatus: {
          present: 0,
          total: 10,
          anomalies: [],
          presentRecords: [],
        },
        unscheduledPresent: [],
      },
    });

    const { result } = renderHook(() => useTeamStatusLogic());

    expect(result.current.hasPresent).toBe(false);
    expect(result.current.teamStatus.present).toBe(0);
  });

  it("should handle null/undefined data gracefully", () => {
    mockUseDashboardOverviewQuery.mockReturnValue({
      data: null,
    });

    const { result } = renderHook(() => useTeamStatusLogic());

    expect(result.current.teamStatus).toEqual({
      present: 0,
      total: 0,
      anomalies: [],
      presentRecords: [],
    });
    expect(result.current.unscheduledPresent).toEqual([]);
    expect(result.current.hasUnscheduledPresent).toBe(false);
    expect(result.current.hasAnomalies).toBe(false);
    expect(result.current.hasPresent).toBe(false);
  });

  it("should memoize unscheduled present calculation", () => {
    const { result, rerender } = renderHook(() => useTeamStatusLogic());

    const firstCall = result.current.unscheduledPresent;
    rerender();
    const secondCall = result.current.unscheduledPresent;

    // Should be the same reference due to memoization
    expect(firstCall).toBe(secondCall);
  });
});
