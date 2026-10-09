import React, { useId } from "react";

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="relative flex items-center justify-center">
            <input
              type="checkbox"
              id={inputId}
              ref={ref}
              aria-invalid={error ? "true" : undefined}
              aria-describedby={error ? `${inputId}-error` : undefined}
              className="peer appearance-none w-5 h-5 bg-token-surface-card border border-token-border-technical rounded-sm checked:bg-token-accent-brand checked:border-token-accent-brand transition-all duration-300 cursor-pointer outline-none focus:ring-2 focus:ring-token-border-focus/30"
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
              className="text-[10px] font-black uppercase tracking-widest text-token-text-secondary cursor-pointer select-none group-hover:text-token-accent-brand transition-colors"
            >
              {label}
            </label>
          )}
        </div>
        {error && (
          <p
            id={`${inputId}-error`}
            className="ml-8 text-[9px] font-black uppercase tracking-widest text-token-status-error animate-pulse"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
