import React from "react";

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="relative flex items-center justify-center">
            <input
              type="checkbox"
              id={inputId}
              ref={ref}
              className="peer appearance-none w-5 h-5 bg-token-surface-card border border-token-border-technical rounded-sm checked:bg-sap-blue checked:border-sap-blue transition-all duration-300 cursor-pointer outline-none focus:ring-2 focus:ring-sap-blue/30"
              {...props}
            />
            {/* Custom Checkmark */}
            <svg
              className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="4"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
          </div>
          {label && (
            <label
              htmlFor={inputId}
              className="text-[10px] font-black uppercase tracking-widest text-token-text-secondary cursor-pointer select-none group-hover:text-sap-blue transition-colors"
            >
              {label}
            </label>
          )}
        </div>
        {error && (
          <p className="ml-8 text-[9px] font-black uppercase tracking-widest text-sap-error animate-pulse">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
