import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useRecordIndicators } from "../../../features/time-control/hooks/useRecordIndicators";

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));
vi.mock("../../../services/apiClient", () => ({
  request: (...args: unknown[]) => requestMock(...args),
}));

describe("useRecordIndicators", () => {
  it("fetches records in bounded batches and preserves special IDs", async () => {
    requestMock.mockReset().mockResolvedValue({ edits: [], pending: [] });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const ids = [...Array.from({ length: 100 }, (_, index) => `r${index}`), "with,comma"];
    const { result } = renderHook(() => useRecordIndicators(ids), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requestMock).toHaveBeenCalledTimes(2);
    const sent = requestMock.mock.calls.map(([arg]) => arg.params.ids as string).join(",");
    expect(sent).toContain("with%2Ccomma");
    expect(sent.split(",")).toHaveLength(101);
  });
});
