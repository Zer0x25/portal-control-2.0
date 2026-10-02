import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.memo(
  React.forwardRef<HTMLInputElement, InputProps>(
    ({ label, id, error, className = "", ...props }, ref) => {
      return (
        <div className="w-full">
          {label && (
            <label
              htmlFor={id}
              className="block text-[10px] font-black uppercase tracking-[0.2em] text-token-text-secondary mb-2 ml-1"
            >
              {label}
            </label>
          )}
          <input
            id={id}
            ref={ref}
            className={`
              w-full px-5 py-4 bg-token-surface-card
              border ${error ? "border-sap-error" : "border-token-border-technical"} 
              rounded-md shadow-sm
              text-token-text-primary placeholder:text-token-text-tertiary 
              focus:ring-2 focus:ring-sap-blue/30 focus:border-sap-blue 
              outline-none transition-all duration-300
              disabled:opacity-50 disabled:cursor-not-allowed
              sm:text-sm font-bold
              ${className}
            `}
            {...props}
          />
          {error && (
            <p className="mt-1.5 ml-1 text-[10px] font-black uppercase tracking-widest text-sap-error animate-pulse">
              {error}
            </p>
          )}
        </div>
      );
    },
  ),
);

export default Input;
