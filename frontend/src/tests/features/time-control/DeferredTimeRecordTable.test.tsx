import React, { act } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DeferredTimeRecordTable from "../../../features/time-control/components/DeferredTimeRecordTable";
import type { TimeRecordTableProps } from "../../../features/time-control/components/TimeRecordTable";

vi.mock("../../../features/time-control/components/TimeRecordTable", () => ({
  default: () => <div data-testid="time-record-table-loaded">Time record table</div>,
}));

const tableProps: TimeRecordTableProps = {
  records: [],
  fetchNextPage: vi.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  isLoading: false,
  onRowDoubleClick: vi.fn(),
  onAddComment: vi.fn(),
  onDelete: vi.fn(),
  isActionDisabledForRole: false,
  roleBasedTooltip: "",
  accountingLockDate: null,
  isControlInternoEnabled: false,
  searchName: "",
  onSearchChange: vi.fn(),
  onExportStreaming: vi.fn(),
  onViewHistory: vi.fn(),
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DeferredTimeRecordTable", () => {
  it("reserves space and waits for the viewport observer", async () => {
    let observerCallback: IntersectionObserverCallback | undefined;
    let observerInstance:
      | {
          observe: ReturnType<typeof vi.fn>;
          disconnect: ReturnType<typeof vi.fn>;
        }
      | undefined;
    class MockIntersectionObserver {
      observe = vi.fn();
      disconnect = vi.fn();

      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback;
        observerInstance = { observe: this.observe, disconnect: this.disconnect };
      }
    }
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    render(<DeferredTimeRecordTable {...tableProps} />);

    expect(screen.getByTestId("deferred-time-record-table-fallback")).toBeVisible();
    expect(screen.queryByTestId("time-record-table-loaded")).not.toBeInTheDocument();
    expect(observerInstance?.observe).toHaveBeenCalledOnce();

    act(() => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        observerInstance as unknown as IntersectionObserver,
      );
    });

    expect(await screen.findByTestId("time-record-table-loaded")).toBeVisible();
    expect(observerInstance?.disconnect).toHaveBeenCalledOnce();
  });

  it("loads the table immediately when IntersectionObserver is unsupported", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    render(<DeferredTimeRecordTable {...tableProps} />);

    expect(await screen.findByTestId("time-record-table-loaded")).toBeVisible();
  });
});
