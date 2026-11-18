import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTimeRecordTableController } from "../../../features/time-control/hooks/useTimeRecordTableController";
import type { AugmentedTimeRecord } from "../../../types";

const { indicators, onExport } = vi.hoisted(() => ({ indicators: vi.fn(), onExport: vi.fn() }));
vi.mock("../../../features/time-control/hooks/useRecordIndicators", () => ({
  useRecordIndicators: (...args: unknown[]) => indicators(...args),
}));

describe("useTimeRecordTableController", () => {
  it("uses scoped indicators for the visible rows", () => {
    indicators.mockReturnValue({
      data: {
        edits: [{ id: "a", action: "TIME_RECORD_EDITED", details: { recordId: "r1" } }],
        pending: [{ id: "p", timeRecordId: "r1", status: "pending" }],
      },
    });
    const records = [{ id: "r1" }] as AugmentedTimeRecord[];
    const { result } = renderHook(() =>
      useTimeRecordTableController({ records, onExportStreaming: onExport }),
    );
    expect(indicators).toHaveBeenCalledWith(["r1"]);
    expect(result.current.editsMapAll.get("r1")).toHaveLength(1);
    expect(result.current.pendingRequestsMap.has("r1")).toBe(true);
  });
  it("delegates export without reporting false success", async () => {
    indicators.mockReturnValue({ data: { edits: [], pending: [] } });
    const { result } = renderHook(() =>
      useTimeRecordTableController({ records: [], onExportStreaming: onExport }),
    );
    await act(async () => {
      await result.current.handleExport("csv");
    });
    expect(onExport).toHaveBeenCalledWith("csv");
  });
});
