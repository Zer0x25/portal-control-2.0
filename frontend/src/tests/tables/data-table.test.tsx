import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  tableFeatures,
  useTable,
  rowSortingFeature,
  rowPaginationFeature,
} from "@tanstack/react-table";
import DataTable from "../../components/ui/DataTable";
import DataTableHeader from "../../components/ui/DataTableHeader";
import DataTableRow from "../../components/ui/DataTableRow";

const features = tableFeatures({ rowSortingFeature, rowPaginationFeature });

interface Row {
  id: string;
  name: string;
}

const columns = [{ id: "name", accessorKey: "name" as const, header: "Nombre" }];

const data: Row[] = [
  { id: "1", name: "Ana" },
  { id: "2", name: "Bruno" },
  { id: "3", name: "Carla" },
];

function TestTable() {
  const table = useTable({ features, columns, data });
  return (
    <DataTable table={table} ariaLabel="Tabla de prueba" rowCount={data.length}>
      <DataTableHeader table={table} />
      <tbody>
        {table.getRowModel().rows.map((row, i) => (
          <DataTableRow key={row.id} rowIndex={i}>
            <td>{row.original.name}</td>
          </DataTableRow>
        ))}
      </tbody>
    </DataTable>
  );
}

describe("DataTable (spec 036 T14)", () => {
  it("expone el contrato ARIA de grid", () => {
    render(<TestTable />);
    const grid = screen.getByRole("grid");
    expect(grid).toHaveAttribute("aria-label", "Tabla de prueba");
    expect(grid).toHaveAttribute("aria-rowcount", "4"); // 3 rows + 1 header
    expect(grid).toHaveAttribute("aria-colcount", "1");
  });

  it("navega entre filas con el teclado", () => {
    render(<TestTable />);
    const grid = screen.getByRole("grid");
    const rows = screen
      .getAllByRole("row")
      .filter((r) => r.getAttribute("data-row-index") !== null);
    expect(rows).toHaveLength(3);

    grid.focus();
    fireEvent.keyDown(grid, { key: "ArrowDown" });
    expect(document.activeElement).toBe(rows[0]);

    fireEvent.keyDown(rows[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(rows[1]);

    fireEvent.keyDown(rows[1], { key: "ArrowUp" });
    expect(document.activeElement).toBe(rows[0]);

    fireEvent.keyDown(rows[0], { key: "End" });
    expect(document.activeElement).toBe(rows[2]);

    fireEvent.keyDown(rows[2], { key: "Home" });
    expect(document.activeElement).toBe(rows[0]);
  });
});
