import React from "react";

/**
 * Fila de `DataTable` (spec 036 T14).
 *
 * Aporta el contrato ARIA de fila del grid (`aria-rowindex`) y la fila activa
 * de la navegación por teclado (roving tabindex): `DataTable` mueve el foco
 * con las flechas entre los `tr[data-row-index]` y marca como tabulable solo
 * la fila enfocada.
 *
 * `rowIndex` es el índice **absoluto** (0-based) en el dataset completo, no en
 * la página actual: así `aria-rowindex` sigue siendo correcto al paginar.
 * La fila 1 del grid es la cabecera, por eso el offset por defecto es +2.
 */
export interface DataTableRowProps extends Omit<
  React.HTMLAttributes<HTMLTableRowElement>,
  "children"
> {
  /** Índice 0-based en el dataset completo (todas las páginas). */
  rowIndex: number;
  /** Índice 1-based para `aria-rowindex`. Default: `rowIndex + 2`. */
  ariaRowIndex?: number;
  children: React.ReactNode;
}

const DataTableRow: React.FC<DataTableRowProps> = ({
  rowIndex,
  ariaRowIndex,
  className = "",
  children,
  ...rest
}) => (
  <tr
    data-row-index={rowIndex}
    aria-rowindex={ariaRowIndex ?? rowIndex + 2}
    tabIndex={-1}
    className={className}
    {...rest}
  >
    {children}
  </tr>
);

export default DataTableRow;
