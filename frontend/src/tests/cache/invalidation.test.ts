import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import React from "react";
import { server } from "../mocks/server";
import { fixtures } from "../mocks/fixtures";
import { useShiftReportsInfinite } from "../../hooks/queries/useShiftReportsInfinite";
import { useReportMutations } from "../../hooks/useReportMutations";
import { useShiftPatternsQuery } from "../../hooks/queries/useShiftPatternsQuery";
import { useShiftMutations } from "../../hooks/useShiftMutations";
import { useHolidaysQuery } from "../../hooks/queries/useHolidaysQuery";
import { useHolidayMutations } from "../../hooks/useHolidayMutations";
import {
  shouldDehydrateQuery,
  SENSITIVE_QUERY_ROOTS,
  PERSISTED_QUERY_ROOTS,
} from "../../lib/queryCache";
import { ShiftReport } from "../../types";

vi.mock("../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: vi.fn() }),
}));

describe("Cache Invalidation & Freshness (AC2)", () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

    return ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Shift Reports Invalidation Bug Verification (T6 / AC2)", () => {
    /**
     * T6: Pre-034 regression evidence.
     * useReportMutations invalidates ["reports"], but useShiftReportsInfinite queries ["shiftReports"].
     * TanStack prefix matching fails to link them, leaving ["shiftReports"] stale.
     * it.fails verifies this exact defect locally while keeping CI green.
     */
    it.fails(
      "demonstrates the stale cache bug before spec 034: ['reports'] mutation does not invalidate ['shiftReports'] query",
      async () => {
        let reportsInBackend: ShiftReport[] = [fixtures.mockShiftReport];

        server.use(
          http.get("*/api/shift-reports", () => {
            return HttpResponse.json({
              success: true,
              data: reportsInBackend,
            });
          }),
          http.post("*/api/shift-reports", async ({ request }) => {
            const body = (await request.json()) as ShiftReport;
            reportsInBackend = [...reportsInBackend, body];
            return HttpResponse.json({ success: true, data: body });
          }),
        );

        const wrapper = createWrapper();
        const { result: queryResult } = renderHook(
          () => useShiftReportsInfinite({ pageSize: 10 }),
          { wrapper },
        );

        await waitFor(() => {
          expect(queryResult.current.data?.pages[0].data).toHaveLength(1);
        });

        const { result: mutationResult } = renderHook(() => useReportMutations(), {
          wrapper,
        });

        const newReport: ShiftReport = {
          ...fixtures.mockShiftReport,
          id: "sr-2",
          folio: "FOL-002",
        };

        await act(async () => {
          await mutationResult.current.addReport(newReport);
        });

        // The mutation completed and invalidated ["reports"], but query is ["shiftReports"].
        // This expectation fails before spec 034 Phase D merges, proving the bug.
        await waitFor(
          () => {
            expect(queryResult.current.data?.pages[0].data).toHaveLength(2);
          },
          { timeout: 500 },
        );
      },
    );

    it("successfully refetches when the matching query key is invalidated", async () => {
      let reportsInBackend: ShiftReport[] = [fixtures.mockShiftReport];

      server.use(
        http.get("*/api/shift-reports", () => {
          return HttpResponse.json({
            success: true,
            data: reportsInBackend,
          });
        }),
      );

      const wrapper = createWrapper();
      const { result: queryResult } = renderHook(() => useShiftReportsInfinite({ pageSize: 10 }), {
        wrapper,
      });

      await waitFor(() => {
        expect(queryResult.current.data?.pages[0].data).toHaveLength(1);
      });

      // Simulate backend change
      reportsInBackend = [
        ...reportsInBackend,
        { ...fixtures.mockShiftReport, id: "sr-2", folio: "FOL-002" },
      ];

      // Invalidate with the exact query key prefix
      await act(async () => {
        await queryClient.invalidateQueries({ queryKey: ["shiftReports"] });
      });

      await waitFor(() => {
        expect(queryResult.current.data?.pages[0].data).toHaveLength(2);
      });
    });
  });

  describe("Shift Patterns & Holidays Invalidation (T5)", () => {
    it("invalidates and refetches shiftPatterns on pattern creation", async () => {
      let patternsInBackend = [fixtures.mockShiftPattern];

      server.use(
        http.get("*/api/shifts/patterns", () => {
          return HttpResponse.json(patternsInBackend);
        }),
        http.post("*/api/shifts/patterns", async ({ request }) => {
          const body = (await request.json()) as typeof fixtures.mockShiftPattern;
          patternsInBackend = [...patternsInBackend, body];
          return HttpResponse.json(body, { status: 201 });
        }),
      );

      const wrapper = createWrapper();
      const { result: queryResult } = renderHook(() => useShiftPatternsQuery(), { wrapper });

      await waitFor(() => {
        expect(queryResult.current.data).toHaveLength(1);
      });

      const { result: mutationResult } = renderHook(() => useShiftMutations(), {
        wrapper,
      });

      const newPattern = {
        ...fixtures.mockShiftPattern,
        id: "pat-2",
        name: "Pattern 2",
      };

      await act(async () => {
        await mutationResult.current.createPattern(newPattern);
      });

      await waitFor(() => {
        expect(queryResult.current.data).toHaveLength(2);
      });
    });

    it("invalidates and refetches holidays on holiday creation", async () => {
      let holidaysInBackend = [fixtures.mockHoliday];

      server.use(
        http.get("*/api/holidays", () => {
          return HttpResponse.json(holidaysInBackend);
        }),
        http.post("*/api/holidays", async ({ request }) => {
          const body = (await request.json()) as typeof fixtures.mockHoliday;
          holidaysInBackend = [...holidaysInBackend, body];
          return HttpResponse.json(body, { status: 201 });
        }),
      );

      const wrapper = createWrapper();
      const { result: queryResult } = renderHook(() => useHolidaysQuery(), {
        wrapper,
      });

      await waitFor(() => {
        expect(queryResult.current.data).toHaveLength(1);
      });

      const { result: mutationResult } = renderHook(() => useHolidayMutations(), {
        wrapper,
      });

      const newHoliday = {
        ...fixtures.mockHoliday,
        id: "hol-2",
        name: "Año Nuevo",
        date: "2027-01-01",
      };

      await act(async () => {
        await mutationResult.current.createHoliday(newHoliday);
      });

      await waitFor(() => {
        expect(queryResult.current.data).toHaveLength(2);
      });
    });
  });

  describe("Config & Audit Logs Allowlist Invalidation (T7)", () => {
    it("demonstrates prefix invalidation semantics for config queries", async () => {
      let configVal = "Initial Title";

      server.use(
        http.get("*/api/configs/system_title", () => {
          return HttpResponse.json({
            key: "system_title",
            value: configVal,
          });
        }),
      );

      queryClient.setQueryData(["config", "system_title"], {
        key: "system_title",
        value: "Initial Title",
      });

      expect(queryClient.getQueryData(["config", "system_title"])).toEqual({
        key: "system_title",
        value: "Initial Title",
      });

      configVal = "Updated Title";

      // Prefix invalidation: ["config"] invalidates ["config", "system_title"]
      await act(async () => {
        await queryClient.invalidateQueries({ queryKey: ["config"] });
      });

      const queryState = queryClient.getQueryState(["config", "system_title"]);
      expect(queryState?.isInvalidated).toBe(true);
    });

    it("confirms auditLogs is recognized as sensitive while kebab audit-logs is outside the allowlist", () => {
      expect(SENSITIVE_QUERY_ROOTS).toContain("auditLogs");
      expect(PERSISTED_QUERY_ROOTS).not.toContain("auditLogs");

      // Test dehydrated state check
      const sensitiveQuery = {
        state: { status: "success" },
        queryKey: ["auditLogs", { page: 1 }],
      } as unknown as Parameters<typeof shouldDehydrateQuery>[0];

      expect(shouldDehydrateQuery(sensitiveQuery)).toBe(false);

      // Kebab-case root outside allowlist
      const kebabQuery = {
        state: { status: "success" },
        queryKey: ["audit-logs", { page: 1 }],
      } as unknown as Parameters<typeof shouldDehydrateQuery>[0];

      expect(shouldDehydrateQuery(kebabQuery)).toBe(false);
    });
  });
});
