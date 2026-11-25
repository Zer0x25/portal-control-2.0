import React, { useId } from "react";
import { ChevronDownIcon } from "./icons/index";

export interface FilterSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FilterSelectProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "defaultValue"
> {
  /** Etiqueta visible vinculada por `htmlFor`. */
  label: string;
  options: readonly FilterSelectOption[];
  value: string;
  /** Icono decorativo a la izquierda del texto seleccionado. */
  icon?: React.ReactNode;
  error?: string;
  /** Clases adicionales para el contenedor raíz. */
  containerClassName?: string;
}

/**
 * Selector desplegable canónico del sistema (altura táctil 44 px, chevron
 * propio y tokens semánticos). Reemplaza los `<select>` crudos con
 * `appearance-none` que carecían de indicador y usaban superficies/ad-hoc.
 */
const FilterSelect = React.forwardRef<HTMLSelectElement, FilterSelectProps>(
  (
    { label, options, value, icon, error, id, className = "", containerClassName = "", ...props },
    ref,
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const errorId = `${selectId}-error`;

    return (
      <div className={`w-full min-w-0 ${containerClassName}`}>
        <label
          htmlFor={selectId}
          className="text-[10px] font-black uppercase tracking-[0.2em] text-token-text-secondary mb-2 ml-1 block"
        >
          {label}
        </label>
        <div className="relative group/select">
          {icon && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-token-accent-brand opacity-40 transition-opacity group-focus-within/select:opacity-100"
            >
              {icon}
            </span>
          )}
          <select
            id={selectId}
            ref={ref}
            value={value}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? errorId : undefined}
            className={`
              block w-full h-[44px] min-h-[44px] appearance-none cursor-pointer
              ${icon ? "pl-11" : "pl-4"} pr-10
              bg-token-surface-card text-token-text-primary
              border ${error ? "border-token-status-error" : "border-token-border-technical"}
              rounded-md shadow-sm text-[11px] md:text-[12px] font-bold uppercase tracking-tight
              text-ellipsis overflow-hidden whitespace-nowrap
              transition-all duration-300 outline-none
              focus:ring-2 focus:ring-token-border-focus focus:border-token-accent-brand
              hover:bg-token-surface-hover
              disabled:opacity-50 disabled:cursor-not-allowed
              ${className}
            `}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-token-text-tertiary transition-colors group-hover/select:text-token-accent-brand"
          >
            <ChevronDownIcon className="w-4 h-4" />
          </span>
        </div>
        {error && (
          <p
            id={errorId}
            className="mt-1.5 ml-1 text-[10px] font-black uppercase tracking-widest text-token-status-error-text"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);

FilterSelect.displayName = "FilterSelect";

export default FilterSelect;
