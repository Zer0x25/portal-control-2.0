import React from "react";
import { ChevronUpIcon, ChevronDownIcon } from "./icons/index";

interface SortableHeaderProps<T> {
  title: string;
  sortKey: keyof T;
  sortConfig: { key: keyof T; direction: "ascending" | "descending" } | null;
  onSort: (key: keyof T) => void;
  className?: string;
  style?: React.CSSProperties;
  as?: "th" | "div";
}

const SortableHeader = <T,>({
  title,
  sortKey,
  sortConfig,
  onSort,
  className = "",
  style,
  as = "th",
}: SortableHeaderProps<T>) => {
  const isSorted = sortConfig?.key === sortKey;
  const isAscending = isSorted && sortConfig?.direction === "ascending";

  const Component = as;

  const thSortableClass = `px-4 h-[48px] text-left text-[13px] font-bold uppercase tracking-[0.1em] cursor-pointer group select-none transition-all duration-150 hover:bg-token-surface-active ${className}`;

  const renderSortIndicator = () => {
    if (!isSorted) {
      return (
        <div className="ml-1.5 w-3.5 h-3.5 rounded-sm bg-token-surface-active flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
          <ChevronDownIcon className="w-2.5 h-2.5 text-token-text-tertiary" />
        </div>
      );
    }
    return (
      <div className="ml-1.5 w-4 h-4 rounded-sm bg-sap-blue flex items-center justify-center shadow-sm transition-all">
        {isAscending ? (
          <ChevronUpIcon className="w-2.5 h-2.5 text-white" />
        ) : (
          <ChevronDownIcon className="w-2.5 h-2.5 text-white" />
        )}
      </div>
    );
  };

  return (
    <Component className={thSortableClass} onClick={() => onSort(sortKey)} style={style}>
      <div className="flex items-center">
        {title}
        {renderSortIndicator()}
      </div>
    </Component>
  );
};

export default SortableHeader;
