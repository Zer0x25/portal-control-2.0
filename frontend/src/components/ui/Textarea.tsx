import React from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, id, error, className = "", ...props }, ref) => {
    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label
            htmlFor={id}
            className="block text-[10px] font-black uppercase tracking-[0.2em] text-token-text-secondary mb-2 ml-1"
          >
            {label}
          </label>
        )}
        <textarea
          id={id}
          ref={ref}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error && id ? `${id}-error` : undefined}
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
            id={id ? `${id}-error` : undefined}
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
