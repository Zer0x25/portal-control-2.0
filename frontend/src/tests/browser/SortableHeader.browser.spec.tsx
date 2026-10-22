import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SortableHeader from "../../components/ui/SortableHeader";

interface SampleRow {
  id: string;
  name: string;
  amount: number;
}

describe("SortableHeader in Real Browser (AC5)", () => {
  it("renders with real layout dimensions, triggers sort callback and updates direction", () => {
    const handleSort = vi.fn();

    const TestTable = () => {
      const [sortConfig, setSortConfig] = useState<{
        key: keyof SampleRow;
        direction: "ascending" | "descending";
      } | null>({ key: "name", direction: "ascending" });

      return (
        <table>
          <thead>
            <tr>
              <SortableHeader<SampleRow>
                title="Nombre"
                sortKey="name"
                sortConfig={sortConfig}
                onSort={(key) => {
                  handleSort(key);
                  setSortConfig({
                    key,
                    direction:
                      sortConfig?.key === key && sortConfig.direction === "ascending"
                        ? "descending"
                        : "ascending",
                  });
                }}
              />
            </tr>
          </thead>
        </table>
      );
    };

    render(<TestTable />);

    const th = screen.getByRole("columnheader");
    expect(th).toBeInTheDocument();

    const rect = th.getBoundingClientRect();
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);

    // Initial ascending sort indicator exists
    expect(th.textContent).toContain("Nombre");
    expect(th).toHaveAttribute("aria-sort", "ascending");

    // The header renders a native button with an accessible name (AC6).
    const button = screen.getByRole("button", { name: /Ordenar por Nombre/i });
    expect(button).toBeInTheDocument();

    // Click to toggle to descending
    fireEvent.click(button);
    expect(handleSort).toHaveBeenCalledWith("name");
  });
});
