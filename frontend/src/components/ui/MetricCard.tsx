import React, { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  label?: string;
  icon?: ReactNode;
  trend?: {
    value: string | number;
    isPositive: boolean;
  };
  indicatorColor?: string; // e.g., "emerald", "indigo", "orange", "slate"
  className?: string;
  onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  label,
  icon,
  trend,
  indicatorColor = "indigo",
  className = "",
  onClick,
}) => {
  // Map simple color names to Tailwind sets to avoid fragile string manipulation
  const colorMap: Record<string, { dot: string; bg: string; border: string; text: string }> = {
    emerald: {
      dot: "bg-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      text: "text-emerald-600",
    },
    indigo: {
      dot: "bg-sap-blue",
      bg: "bg-sap-blue/10",
      border: "border-sap-blue/20",
      text: "text-sap-blue",
    },
    orange: {
      dot: "bg-orange-500",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      text: "text-orange-600",
    },
    slate: {
      dot: "bg-token-text-tertiary",
      bg: "bg-token-surface-active",
      border: "border-token-border-subtle",
      text: "text-token-text-secondary",
    },
    gray: {
      dot: "bg-gray-500",
      bg: "bg-gray-500/10",
      border: "border-gray-500/20",
      text: "text-gray-500",
    },
  };

  const colorKey = indicatorColor.replace("bg-", "").split("-")[0];
  const theme = colorMap[colorKey] || colorMap.slate;

  return (
    <div
      onClick={onClick}
      className={`
        animate-in fade-in duration-150 relative flex flex-col p-3 rounded-md border border-token-border-subtle shadow-none transition-all duration-150
        bg-token-surface-stripe
        ${onClick ? "cursor-pointer active:scale-[0.98] hover:border-token-accent-active hover:bg-token-surface-active" : ""}
        ${className}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`w-1.5 h-1.5 rounded-full ${theme.dot} opacity-60 shadow-none`} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-token-text-tertiary leading-none truncate px-2 text-center">
          {title}
        </span>
        <div className="w-1.5 h-1.5 rounded-full opacity-0" /> {/* Balance */}
      </div>

      <div className="flex flex-col items-center justify-center py-1">
        {icon && (
          <div
            className={`w-7 h-7 rounded-sm flex items-center justify-center mb-2 ${theme.bg} border ${theme.border} ${theme.text}`}
          >
            {React.isValidElement<{ className?: string }>(icon)
              ? React.cloneElement(icon, { className: "w-3.5 h-3.5" })
              : icon}
          </div>
        )}
        <h2 className="text-3xl font-bold text-token-text-primary tracking-tighter leading-none truncate text-center">
          {value}
        </h2>
      </div>

      {(label || trend) && (
        <div className="mt-3 pt-2.5 border-t border-token-border-subtle flex flex-col items-center justify-center gap-1 overflow-hidden opacity-80">
          {label && (
            <span className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-wider truncate text-center">
              {label}
            </span>
          )}
          {trend && (
            <span
              className={`text-[9px] font-bold ${trend.isPositive ? "text-emerald-600" : "text-rose-600"} whitespace-nowrap text-center`}
            >
              {trend.isPositive ? "↑" : "↓"} {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default MetricCard;
