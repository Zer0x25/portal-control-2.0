import React, { ReactNode } from "react";

interface DashboardRowProps {
  icon?: ReactNode;
  initial?: string;
  title: string;
  subtitle: string;
  extra?: ReactNode;
  indicator?: ReactNode;
  onDoubleClick?: () => void;
  onClick?: () => void;
  className?: string;
  variant?: "stripe" | "card";
}

const DashboardRow: React.FC<DashboardRowProps> = ({
  icon,
  initial,
  title,
  subtitle,
  extra,
  indicator,
  onDoubleClick,
  onClick,
  className = "",
  variant = "stripe",
}) => {
  const bgClass = variant === "stripe" ? "bg-token-surface-stripe" : "bg-token-surface-card";

  return (
    <div
      onDoubleClick={onDoubleClick}
      onClick={onClick}
      className={`
        flex items-center justify-between p-3.5 rounded-sm border border-token-border-technical 
        cursor-pointer transition-all group hover:border-sap-blue/40 ${bgClass} ${className}
      `}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        {icon ? (
          <div className="w-8 h-8 rounded-sm bg-token-surface-active flex items-center justify-center text-token-text-secondary">
            {icon}
          </div>
        ) : initial ? (
          <div className="w-8 h-8 rounded-sm bg-token-surface-active flex items-center justify-center font-bold text-token-text-secondary text-xs">
            {initial}
          </div>
        ) : null}

        <div className="flex-1 min-w-0">
          <p className="font-bold text-[13px] text-token-text-primary group-hover:text-sap-blue transition-colors truncate">
            {title}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold text-token-text-tertiary uppercase tracking-wider mt-0.5 truncate">
              {subtitle}
            </p>
            {extra}
          </div>
        </div>
      </div>

      {indicator && <div className="shrink-0 ml-3">{indicator}</div>}
    </div>
  );
};

export default DashboardRow;
