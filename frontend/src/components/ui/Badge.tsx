import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "success" | "danger" | "warning" | "info" | "neutral";
  size?: "sm" | "md";
  showDot?: boolean;
  fontMono?: boolean;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  size = "md",
  showDot = false,
  fontMono = false,
  className = "",
}) => {
  const baseStyles = `inline-flex items-center font-black uppercase tracking-widest rounded-md border transition-all duration-300 ${fontMono ? "font-mono" : ""}`;

  const variantStyles = {
    primary: "bg-token-accent-brand/10 text-token-accent-brand border-token-accent-brand/20",
    secondary: "bg-token-surface-stripe text-token-text-secondary border-token-border-subtle",
    success: "bg-token-status-success/10 text-token-status-success border-token-status-success/20",
    danger: "bg-token-status-error/10 text-token-status-error border-token-status-error/20",
    warning: "bg-token-status-warning/10 text-token-status-warning border-token-status-warning/20",
    info: "bg-token-status-info/10 text-token-status-info border-token-status-info/20",
    neutral: "bg-token-surface-stripe text-token-text-tertiary border-token-border-subtle",
  };

  const dotStyles = {
    primary: "bg-token-accent-brand",
    secondary: "bg-token-text-secondary",
    success: "bg-token-status-success",
    danger: "bg-token-status-error",
    warning: "bg-token-status-warning",
    info: "bg-token-status-info",
    neutral: "bg-token-text-tertiary",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[8px] gap-1.5",
    md: "px-3 py-1 text-[10px] gap-2",
  };

  return (
    <span className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotStyles[variant]}`} />
      )}
      {children}
    </span>
  );
};

export default Badge;
