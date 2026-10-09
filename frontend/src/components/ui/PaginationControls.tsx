import React from "react";
import Button from "./Button";
import {
  ChevronDoubleLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleRightIcon,
} from "./icons/index";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  className?: string;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  setCurrentPage,
  className = "",
}) => {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={`flex justify-between items-center py-2 ${className}`}>
      <div className="flex items-center gap-2">
        <Button
          onClick={() => setCurrentPage(1)}
          disabled={currentPage === 1}
          variant="secondary"
          size="sm"
          className="p-2 hidden sm:inline-flex rounded-md shadow-sm"
          title="Primera página"
        >
          <ChevronDoubleLeftIcon className="w-5 h-5 text-token-text-secondary" />
        </Button>
        <Button
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
          variant="secondary"
          size="sm"
          className="flex items-center px-4 py-2 rounded-md shadow-sm font-bold text-[10px] uppercase tracking-wider"
          title="Página anterior"
        >
          <ChevronLeftIcon className="w-4 h-4 mr-1.5" />
          Anterior
        </Button>
      </div>

      <div className="flex flex-col items-center">
        <span className="text-[10px] font-black text-token-text-tertiary uppercase tracking-[0.2em]">
          Página
        </span>
        <span className="text-sm font-black text-token-accent-brand tabular-nums">
          {currentPage} <span className="text-token-text-tertiary font-medium">/</span> {totalPages}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          variant="secondary"
          size="sm"
          className="flex items-center px-4 py-2 rounded-md shadow-sm font-bold text-[10px] uppercase tracking-wider"
          title="Página siguiente"
        >
          Siguiente
          <ChevronRightIcon className="w-4 h-4 ml-1.5" />
        </Button>
        <Button
          onClick={() => setCurrentPage(totalPages)}
          disabled={currentPage === totalPages}
          variant="secondary"
          size="sm"
          className="p-2 hidden sm:inline-flex rounded-md shadow-sm"
          title="Última página"
        >
          <ChevronDoubleRightIcon className="w-5 h-5 text-token-text-secondary" />
        </Button>
      </div>
    </div>
  );
};

export default PaginationControls;
