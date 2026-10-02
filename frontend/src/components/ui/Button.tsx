import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "success" | "warning" | "info" | "ghost" | "none";
  size?: "xs" | "sm" | "md" | "lg";
  children: React.ReactNode;
  loading?: boolean;
}

const Button = React.memo(
  React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
      {
        children,
        variant = "primary",
        size = "md",
        className = "",
        loading = false,
        disabled,
        type = "button",
        ...props
      },
      ref,
    ) => {
      const baseStyles =
        "font-black uppercase tracking-widest rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-token-surface-app transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center shadow-sm";

      let variantStyles = "";
      switch (variant) {
        case "primary":
          variantStyles =
            "bg-token-accent-brand text-token-text-onAccent border-none hover:opacity-90 active:scale-95 shadow-sm focus:ring-token-accent-brand transition-all";
          break;
        case "secondary":
          variantStyles =
            "bg-token-surface-card text-token-text-primary border border-token-border-technical hover:bg-token-surface-hover shadow-sm focus:ring-token-border-focus";
          break;
        case "danger":
          variantStyles =
            "bg-token-status-error text-token-text-onAccent border-none hover:opacity-95 active:scale-95 shadow-sm focus:ring-token-status-error transition-colors";
          break;
        case "success":
          variantStyles =
            "bg-token-status-success text-token-text-onAccent border-none hover:opacity-95 active:scale-95 shadow-sm focus:ring-token-status-success transition-colors";
          break;
        case "warning":
          variantStyles =
            "bg-token-status-warning text-token-text-onAccent border-none hover:opacity-95 active:scale-95 shadow-sm focus:ring-token-status-warning transition-colors";
          break;
        case "info":
          variantStyles =
            "bg-token-status-info text-token-text-onAccent border-none hover:opacity-95 active:scale-95 shadow-sm focus:ring-token-status-info transition-colors";
          break;
        case "ghost":
          variantStyles =
            "bg-transparent text-token-text-secondary hover:bg-token-surface-hover focus:ring-token-border-focus border-none shadow-none transition-colors";
          break;
        case "none":
          variantStyles = "";
          break;
      }

      let sizeStyles = "";
      switch (size) {
        case "xs":
          sizeStyles = "px-3 py-1.5 text-[9px]";
          break;
        case "sm":
          sizeStyles = "px-4 py-2 text-[10px]";
          break;
        case "md":
          sizeStyles = "px-6 py-3 text-[11px]";
          break;
        case "lg":
          sizeStyles = "px-8 py-4 text-xs";
          break;
      }

      return (
        <button
          ref={ref}
          type={type}
          className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className} ${loading ? "relative !text-transparent pointer-events-none" : ""}`}
          disabled={disabled || loading}
          {...props}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="animate-spin h-5 w-5 text-current"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          )}
          {children}
        </button>
      );
    },
  ),
);

export default Button;
