import React from "react";

interface IconBoxProps {
  icon: React.ReactNode;
  variant?: "primary" | "success" | "warning" | "danger" | "neutral" | "light";
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Standardized container for icons.
 * Follows the Cinematic Industrial design system: subtle backgrounds, crisp borders.
 */
export const IconBox: React.FC<IconBoxProps> = ({
  icon,
  variant = "primary",
  size = "md",
  className = "",
}) => {
  const variantStyles = {
    primary: "bg-token-surface-stripe text-token-accent-brand border-token-border-subtle",
    success:
      "bg-token-status-success-surface text-token-status-success-text border-token-status-success/30",
    warning:
      "bg-token-status-warning-surface text-token-status-warning-text border-token-status-warning/30",
    danger:
      "bg-token-status-error-surface text-token-status-error-text border-token-status-error/30",
    neutral: "bg-token-surface-stripe text-token-text-secondary border-token-border-subtle",
    light: "bg-token-surface-card border-token-border-subtle text-token-text-primary shadow-sm",
  };

  const sizeStyles = {
    sm: "w-8 h-8 rounded-md",
    md: "w-10 h-10 rounded-md",
    lg: "w-12 h-12 rounded-lg",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <div
      className={`
      flex items-center justify-center border
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${className}
    `}
    >
      {React.isValidElement<{ className?: string }>(icon)
        ? React.cloneElement(icon, {
            className: `${iconSizes[size]} ${icon.props.className || ""}`,
          })
        : icon}
    </div>
  );
};

export default IconBox;
