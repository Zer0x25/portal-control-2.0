import React, { useId } from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

/**
 * Spec 036 T4 (AC3): `id` garantizado.
 *
 * Igual que `Input`: sin `id` del consumidor, el mensaje de error no quedaba
 * asociado al control (`aria-describedby` quedaba sin destino). El fallback
 * de `useId()` cierra el hueco sin añadir props.
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, id, error, className = "", ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id || generatedId;
    const errorId = `${textareaId}-error`;

    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-[10px] font-black uppercase tracking-[0.2em] text-token-text-secondary mb-2 ml-1"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? errorId : undefined}
          // Sin <label> visible, el placeholder/label prop actúa como nombre accesible.
          aria-label={props["aria-label"] ?? label ?? props.placeholder}
          className={`
          w-full px-5 py-4 bg-token-surface-card
          border ${error ? "border-token-status-error" : "border-token-border-technical"} 
          rounded-md shadow-sm
          text-token-text-primary placeholder:text-token-text-tertiary 
          focus:ring-2 focus:ring-token-border-focus focus:border-token-accent-brand 
          outline-none transition-all duration-300
          disabled:opacity-50 disabled:cursor-not-allowed
          sm:text-sm font-bold resize-y min-h-[100px]
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

Textarea.displayName = "Textarea";

export default Textarea;
