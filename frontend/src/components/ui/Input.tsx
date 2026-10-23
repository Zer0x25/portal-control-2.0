import React, { useId } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/**
 * Spec 036 T4 (AC3): `id` garantizado.
 *
 * Antes, `aria-describedby` dependía de que el consumidor pasara `id`: sin
 * él, el mensaje de error existía en el DOM pero **no** quedaba asociado al
 * control (`aria-describedby={error && id ? ... : undefined}`). Con el
 * fallback de `useId()` el contrato de a11y se cumple en el 100 % de los
 * casos, sin introducir una prop nueva.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, error, className = "", ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[10px] font-black uppercase tracking-[0.2em] text-token-text-secondary mb-2 ml-1"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? errorId : undefined}
          // Sin <label> visible, el placeholder/label prop actúa como nombre
          // accesible (a11y + agentes). Explícito siempre gana vía spread.
          aria-label={props["aria-label"] ?? label ?? props.placeholder}
          className={`
              w-full px-5 py-4 bg-token-surface-card
              border ${error ? "border-token-status-error" : "border-token-border-technical"} 
              rounded-md shadow-sm
              text-token-text-primary placeholder:text-token-text-tertiary 
              focus:ring-2 focus:ring-token-border-focus focus:border-token-accent-brand 
              outline-none transition-all duration-300
              disabled:opacity-50 disabled:cursor-not-allowed
              sm:text-sm font-bold
              ${className}
            `}
          {...props}
        />
        {error && (
          <p
            id={errorId}
            className="mt-1.5 ml-1 text-[10px] font-black uppercase tracking-widest text-token-status-error animate-pulse"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);

export default Input;
