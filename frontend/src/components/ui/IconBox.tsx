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
    primary:
      "bg-slate-100 text-slate-900 border-slate-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-900/50",
    success:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/30",
    warning:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/30",
    danger: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/30",
    neutral: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
    light: "bg-white border-gray-200 text-slate-900 shadow-sm",
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
