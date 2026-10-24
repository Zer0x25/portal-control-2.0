import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: null as { role: string } | null,
  getAll: vi.fn(async () => ({ data: [] as unknown[] })),
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ currentUser: mocks.currentUser }),
}));

vi.mock("../../services/shiftReportService", () => ({
  shiftReportService: { getAll: () => mocks.getAll() },
}));

import { useReportsQuery } from "../../hooks/queries/useReportsQuery";

describe("useReportsQuery authorization and enablement", () => {
  let client: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    mocks.currentUser = null;
    mocks.getAll.mockClear();
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  });

  afterEach(() => {
    cleanup();
    client.clear();
  });

  it.each(["Administrador", "Supervisor_Elevado", "Supervisor", "Reloj_Control"])(
    "loads reports for the authorized role %s",
    async (role) => {
      mocks.currentUser = { role };

      renderHook(() => useReportsQuery(), { wrapper });

      await waitFor(() => expect(mocks.getAll).toHaveBeenCalledTimes(1));
    },
  );

  it("keeps reports disabled for a role without report access", () => {
    mocks.currentUser = { role: "Usuario" };

    renderHook(() => useReportsQuery(), { wrapper });

    expect(mocks.getAll).not.toHaveBeenCalled();
  });

  it("supports disabling the report query for an automation consumer", () => {
    mocks.currentUser = { role: "Administrador" };

    renderHook(() => useReportsQuery({}, { enabled: false }), { wrapper });

    expect(mocks.getAll).not.toHaveBeenCalled();
  });
});
