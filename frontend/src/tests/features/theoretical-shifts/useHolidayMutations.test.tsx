import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useHolidayMutations } from "../../../hooks/useHolidayMutations";
import { holidayService } from "../../../services/holidayService";

const { addToastMock } = vi.hoisted(() => ({
  addToastMock: vi.fn(),
}));

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => ({
    addToast: addToastMock,
  }),
}));

describe("useHolidayMutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows total and year in toast when syncHolidays succeeds", async () => {
    vi.spyOn(holidayService, "syncExternalHolidays").mockResolvedValue({
      success: true,
      total: 16,
      year: 2026,
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useHolidayMutations(), { wrapper });

    await act(async () => {
      await result.current.syncHolidays();
    });

    expect(addToastMock).toHaveBeenCalledWith("16 feriados sincronizados para 2026.", "success");
  });
});
