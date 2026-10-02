import React from "react";

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = "", id, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={`w-full flex flex-col gap-2 ${className}`}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-[10px] font-black uppercase tracking-[0.2em] text-token-text-secondary ml-1"
          >
            {label}
          </label>
        )}
        <div className="relative group">
          <select
            id={selectId}
            ref={ref}
            className={`
              w-full appearance-none px-5 py-4 bg-token-surface-card
              border ${error ? "border-sap-error" : "border-token-border-technical"} 
              rounded-md shadow-sm
              text-token-text-primary
              focus:ring-2 focus:ring-sap-blue/30 focus:border-sap-blue 
              outline-none transition-all duration-300
              disabled:opacity-50 disabled:cursor-not-allowed
              sm:text-sm font-bold cursor-pointer
            `}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Custom Chevron Icon */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-token-text-tertiary group-hover:text-sap-blue transition-colors">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                d="M19 9l-7 7-7-7"
              ></path>
            </svg>
          </div>
        </div>
        {error && (
          <p className="ml-1 text-[10px] font-black uppercase tracking-widest text-sap-error animate-pulse">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";

export default Select;
