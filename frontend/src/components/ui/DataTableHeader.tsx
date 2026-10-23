import React from "react";
import {
  FlexRender,
  type Column,
  type ReactTable,
  type RowData,
  type TableFeatures,
} from "@tanstack/react-table";
import SortableHeader from "./SortableHeader";

/**
 * Cabecera de `DataTable` (spec 036 T14/T16, AC5/AC6).
 *
 * Recorre los header groups de TanStack Table y delega cada cabecera ordenable
 * en `SortableHeader` (que ya pinta el `<button>` con `aria-sort`), sin
 * duplicar su implementación. Las columnas no ordenables se pintan como
 * `<th scope="col">` planas.
 */

/** Metadatos de columna compartidos por la cabecera y las celdas. */
export interface DataTableColumnMeta {
  headerClassName?: string;
  cellClassName?: string;
}

export const getDataTableColumnMeta = (meta: unknown): DataTableColumnMeta =>
  meta && typeof meta === "object" ? (meta as DataTableColumnMeta) : {};

export interface DataTableHeaderProps<TFeatures extends TableFeatures, TData extends RowData> {
  table: ReactTable<TFeatures, TData>;
  /** Clases del `<tr>` de cabecera. */
  rowClassName?: string;
  /** Clases base de cada `<th>`. */
  headerClassName?: string;
}

const DataTableHeader = <TFeatures extends TableFeatures, TData extends RowData>({
  table,
  rowClassName = "",
  headerClassName = "",
}: DataTableHeaderProps<TFeatures, TData>) => (
  <thead>
    {table.getHeaderGroups().map((headerGroup) => (
      <tr key={headerGroup.id} className={rowClassName}>
        {headerGroup.headers.map((header) => {
          const column = header.column as unknown as Column<TableFeatures, TData, unknown>;
          const meta = getDataTableColumnMeta(column.columnDef.meta);
          const className = [headerClassName, meta.headerClassName].filter(Boolean).join(" ");

          if (header.isPlaceholder) {
            return <th key={header.id} aria-hidden="true" className={className} />;
          }

          const content = <FlexRender header={header} />;
          if (!column.getCanSort()) {
            return (
              <th key={header.id} scope="col" className={className}>
                {content}
              </th>
            );
          }

          const sorted = column.getIsSorted();
          const headerLabel =
            typeof column.columnDef.header === "string" ? column.columnDef.header : column.id;
          return (
            <SortableHeader<Record<string, unknown>>
              key={header.id}
              title={content}
              ariaLabel={`Ordenar por ${headerLabel}`}
              sortKey={column.id}
              sortConfig={
                sorted
                  ? {
                      key: column.id,
                      direction: sorted === "asc" ? "ascending" : "descending",
                    }
                  : null
              }
              onSort={() => column.toggleSorting(sorted === "asc")}
              className={className}
            />
          );
        })}
      </tr>
    ))}
  </thead>
);

export default DataTableHeader;
