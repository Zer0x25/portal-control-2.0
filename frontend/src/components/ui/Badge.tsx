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
    primary: "bg-sap-blue/10 text-sap-blue border-sap-blue/10",
    secondary: "bg-token-surface-stripe text-token-text-secondary border-token-border-subtle",
    success: "bg-sap-success/10 text-sap-success border-sap-success/10",
    danger: "bg-sap-error/10 text-sap-error border-sap-error/10",
    warning: "bg-sap-warning/10 text-sap-warning border-sap-warning/10",
    info: "bg-sap-info/10 text-sap-info border-sap-info/10",
    neutral: "bg-token-surface-stripe text-token-text-tertiary border-token-border-subtle",
  };

  const dotStyles = {
    primary: "bg-sap-blue",
    secondary: "bg-gray-400",
    success: "bg-sap-success",
    danger: "bg-sap-error",
    warning: "bg-sap-warning",
    info: "bg-sap-info",
    neutral: "bg-gray-500",
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
