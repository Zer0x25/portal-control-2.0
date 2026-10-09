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
      dot: "bg-token-status-success",
      bg: "bg-token-status-success/10",
      border: "border-token-status-success/20",
      text: "text-token-status-success",
    },
    indigo: {
      dot: "bg-token-accent-brand",
      bg: "bg-token-accent-brand/10",
      border: "border-token-accent-brand/20",
      text: "text-token-accent-brand",
    },
    orange: {
      dot: "bg-token-status-warning",
      bg: "bg-token-status-warning/10",
      border: "border-token-status-warning/20",
      text: "text-token-status-warning",
    },
    slate: {
      dot: "bg-token-text-tertiary",
      bg: "bg-token-surface-active",
      border: "border-token-border-subtle",
      text: "text-token-text-secondary",
    },
    gray: {
      dot: "bg-token-text-tertiary",
      bg: "bg-token-surface-stripe",
      border: "border-token-border-subtle",
      text: "text-token-text-secondary",
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
        ${onClick ? "cursor-pointer active:scale-[0.98] hover:border-token-accent-brand hover:bg-token-surface-active" : ""}
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
              className={`text-[9px] font-bold ${trend.isPositive ? "text-token-status-success" : "text-token-status-error"} whitespace-nowrap text-center`}
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
