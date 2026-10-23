import React from "react";
import Button from "./Button";
import { ChevronUpIcon, ChevronDownIcon } from "./icons/index";

/**
 * Cabecera ordenable reutilizada por `DataTableHeader` y consumidores directos
 * (EmployeeListCard). La interacción se delega en un `<button>` nativo para que
 * la cabecera sea operable con teclado y exponga `aria-sort` en el
 * `<th>` contenedor (spec 036 T14, AC5/AC6).
 */
interface SortableHeaderProps<T> {
  title: React.ReactNode;
  sortKey: keyof T;
  sortConfig: { key: keyof T; direction: "ascending" | "descending" } | null;
  onSort: (key: keyof T) => void;
  className?: string;
  style?: React.CSSProperties;
  as?: "th" | "div";
  /** Nombre accesible explícito cuando `title` no es texto plano. */
  ariaLabel?: string;
}

const SORT_BUTTON_CLASS =
  "h-full w-full cursor-pointer justify-start! rounded-none! p-0! shadow-none! active:scale-100! " +
  "[font-size:inherit]! [font-weight:inherit]! [letter-spacing:inherit]! [text-transform:inherit]!";

const SortableHeader = <T,>({
  title,
  sortKey,
  sortConfig,
  onSort,
  className = "",
  style,
  as = "th",
  ariaLabel,
}: SortableHeaderProps<T>) => {
  const isSorted = sortConfig?.key === sortKey;
  const isAscending = isSorted && sortConfig?.direction === "ascending";
  const ariaSort = isSorted ? (isAscending ? "ascending" : "descending") : "none";
  const Component = as;

  const renderSortIndicator = () => {
    if (!isSorted) {
      return (
        <div className="ml-1.5 w-3.5 h-3.5 rounded-sm bg-token-surface-active flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
          <ChevronDownIcon className="w-2.5 h-2.5 text-token-text-tertiary" />
        </div>
      );
    }
    return (
      <div className="ml-1.5 w-3.5 h-3.5 rounded-sm bg-token-surface-active flex items-center justify-center transition-all duration-200">
        {isAscending ? (
          <ChevronUpIcon className="w-2.5 h-2.5 text-token-text-accent" />
        ) : (
          <ChevronDownIcon className="w-2.5 h-2.5 text-token-text-accent" />
        )}
      </div>
    );
  };

  const thSortableClass = `px-4 h-[48px] text-left text-[13px] font-bold uppercase tracking-widest cursor-pointer group select-none transition-all duration-150 hover:bg-token-surface-active ${className}`;

  const accessibleName =
    ariaLabel ?? (typeof title === "string" ? `Ordenar por ${title}` : "Ordenar columna");

  const ariaSortProps: React.AriaAttributes =
    as === "th" ? { "aria-sort": ariaSort as React.AriaAttributes["aria-sort"] } : {};

  return (
    <Component className={thSortableClass} style={style} {...ariaSortProps}>
      <Button
        type="button"
        variant="none"
        size="none"
        onClick={() => onSort(sortKey)}
        aria-label={accessibleName}
        className={SORT_BUTTON_CLASS}
      >
        {title}
        <span aria-hidden="true">{renderSortIndicator()}</span>
      </Button>
    </Component>
  );
};

export default SortableHeader;
