import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addReport: vi.fn(async (report: unknown) => report),
  addToast: vi.fn(),
  refetchReports: vi.fn(async () => ({ data: [] })),
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ currentUser: { username: "operador" } }),
}));

vi.mock("../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: mocks.addToast }),
}));

vi.mock("../../hooks/queries/useReportsQuery", () => ({
  useReportsQuery: () => ({ refetch: mocks.refetchReports }),
}));

vi.mock("../../hooks/useReportMutations", () => ({
  useReportMutations: () => ({ addReport: mocks.addReport, isPending: false }),
}));

import { useShiftManager } from "../../hooks/useShiftManager";

describe("useShiftManager timezone helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-23T15:45:00.000Z"));
    mocks.addReport.mockClear();
    mocks.addToast.mockClear();
    mocks.refetchReports.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads the date formatters on shift creation and preserves Chile date/time", async () => {
    const { result } = renderHook(() => useShiftManager());

    await act(async () => {
      await result.current.startNewShift();
    });

    const createdReport = mocks.addReport.mock.calls[0]?.[0] as
      { date: string; logEntries: { time: string }[] } | undefined;
    expect(createdReport?.date).toBe("2026-10-23");
    expect(createdReport?.logEntries[0]?.time).toBe("12:45");
  });
});
