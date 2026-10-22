import React from "react";
import type { ReactTable, RowData, TableFeatures } from "@tanstack/react-table";
import PaginationControls from "./PaginationControls";

/**
 * `DataTable` — data grid headless sobre TanStack Table (spec 036 T14, AC5/AC6).
 *
 * Responsabilidades de la primitiva:
 * - Semántica ARIA de grid: `role="grid"`, `aria-label` (nombre accesible),
 *   `aria-rowcount` (dataset completo, no solo la página) y `aria-colcount`.
 * - Navegación por teclado: el grid es tabulable y las flechas
 *   (`ArrowUp`/`ArrowDown`) más `Home`/`End` mueven el foco entre las filas
 *   `tr[data-row-index]` (roving focus sobre la fila activa).
 * - Reutiliza `PaginationControls` para la paginación (no la reimplementa)
 *   conservando su exportación y su contrato DOM.
 *
 * El consumidor conserva el diseño: aporta `DataTableHeader` + `DataTableRow`
 * y decide los tokens (`token-*`) y la tipografía (`typo-ui-*`).
 */

export interface DataTablePagination {
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  /** Dónde se pinta la cápsula de paginación. Default: `"bottom"`. */
  position?: "top" | "bottom" | "both";
  /** Clases de la cápsula contenedora. Default: `"flex justify-center"`. */
  className?: string;
}

export interface DataTableProps<TFeatures extends TableFeatures, TData extends RowData> {
  /** Instancia de TanStack Table que gobierna columnas y filas. */
  table: ReactTable<TFeatures, TData>;
  /** Nombre accesible del grid (`aria-label`). */
  ariaLabel: string;
  /** Filas de datos del dataset completo (todas las páginas, sin cabecera). */
  rowCount: number;
  /** Columnas del grid. Default: columnas hoja de la tabla. */
  columnCount?: number;
  pagination?: DataTablePagination;
  /** Clases del contenedor externo (ej. separación de la paginación). */
  className?: string;
  /** Clases de la tarjeta que envuelve la tabla. */
  containerClassName?: string;
  /** Clases de la propia `<table>`. */
  tableClassName?: string;
  children: React.ReactNode;
}

const ROW_SELECTOR = "tbody tr[data-row-index]";

const DataTable = <TFeatures extends TableFeatures, TData extends RowData>({
  table,
  ariaLabel,
  rowCount,
  columnCount,
  pagination,
  className = "",
  containerClassName = "overflow-hidden rounded-lg border border-token-border-technical shadow-sm bg-token-surface-card",
  tableClassName = "min-w-full",
  children,
}: DataTableProps<TFeatures, TData>) => {
  const getRows = (tableElement: HTMLTableElement): HTMLTableRowElement[] =>
    Array.from(tableElement.querySelectorAll<HTMLTableRowElement>(ROW_SELECTOR));

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTableElement>) => {
    const rows = getRows(event.currentTarget);
    if (rows.length === 0) return;

    const current = (event.target as HTMLElement).closest<HTMLTableRowElement>(ROW_SELECTOR);
    const currentIndex = current ? rows.indexOf(current) : -1;

    let nextIndex: number;
    switch (event.key) {
      case "ArrowDown":
        nextIndex = currentIndex + 1;
        break;
      case "ArrowUp":
        nextIndex = currentIndex - 1;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = rows.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const clamped = Math.min(Math.max(nextIndex, 0), rows.length - 1);
    rows[clamped]?.focus();
  };

  const renderPagination = () =>
    pagination ? (
      <div className={pagination.className ?? "flex justify-center"}>
        <PaginationControls
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          setCurrentPage={pagination.setCurrentPage}
        />
      </div>
    ) : null;

  const position = pagination?.position ?? "bottom";
  const resolvedColumnCount = columnCount ?? table.getAllLeafColumns().length;

  return (
    <div className={className}>
      {position !== "bottom" ? renderPagination() : null}
      <div className={containerClassName}>
        <table
          data-testid="data-table"
          role="grid"
          aria-label={ariaLabel}
          aria-rowcount={rowCount + 1}
          aria-colcount={resolvedColumnCount}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className={tableClassName}
        >
          {children}
        </table>
      </div>
      {position !== "top" ? renderPagination() : null}
    </div>
  );
};

export default DataTable;
