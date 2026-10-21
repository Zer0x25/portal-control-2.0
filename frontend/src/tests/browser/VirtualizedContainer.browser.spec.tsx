import React, { useRef } from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { useVirtualizer } from "@tanstack/react-virtual";

describe("Virtualized Container in Real Browser (AC5)", () => {
  const VirtualList = ({ itemsCount = 100 }: { itemsCount?: number }) => {
    const parentRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
      count: itemsCount,
      getScrollElement: () => parentRef.current,
      estimateSize: () => 40,
      overscan: 5,
    });

    return (
      <div
        ref={parentRef}
        data-testid="virtual-parent"
        style={{
          height: "200px",
          width: "300px",
          overflowY: "auto",
          contain: "strict",
        }}
      >
        <div
          data-testid="virtual-inner"
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => (
            <div
              key={virtualItem.key}
              data-testid={`virtual-row-${virtualItem.index}`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              Fila #{virtualItem.index}
            </div>
          ))}
        </div>
      </div>
    );
  };

  it("calculates real DOM container dimensions and renders virtualized items", () => {
    render(<VirtualList itemsCount={100} />);

    const parent = screen.getByTestId("virtual-parent");
    const rect = parent.getBoundingClientRect();

    // In a real browser, dimensions are computed exactly by the browser engine
    expect(rect.height).toBe(200);
    expect(rect.width).toBe(300);

    // Initial visible items rendered
    const row0 = screen.getByTestId("virtual-row-0");
    expect(row0).toBeInTheDocument();

    const inner = screen.getByTestId("virtual-inner");
    expect(inner).toBeInTheDocument();
    // 100 items * 40px = 4000px
    expect(inner.style.height).toBe("4000px");
  });
});
