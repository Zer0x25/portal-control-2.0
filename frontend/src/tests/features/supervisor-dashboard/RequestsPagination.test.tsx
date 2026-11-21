import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useRequestsTabVirtualizer } from "../../../features/supervisor-dashboard/hooks/useRequestsTabVirtualizer";
import type { CorrectionRequest } from "../../../types";

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: () => ({ getVirtualItems: () => [{ index: 0 }], getTotalSize: () => 130 }),
}));

describe("paginación del historial de solicitudes", () => {
  it("no reintenta automáticamente después de un error de página", () => {
    const fetchNextPage = vi.fn();
    const options = {
      requests: [{ id: "uno" } as CorrectionRequest],
      itemHeight: 130,
      hasNextPage: true,
      isFetchingNextPage: false,
      isFetchNextPageError: true,
      fetchNextPage,
    };
    const { rerender } = renderHook((props) => useRequestsTabVirtualizer(props), {
      initialProps: options,
    });
    expect(fetchNextPage).not.toHaveBeenCalled();
    rerender({ ...options, isFetchNextPageError: false });
    expect(fetchNextPage).toHaveBeenCalledOnce();
  });
});
