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
  showAnimation?: boolean;
  animationDelay?: number;
}

/**
 * Componente mejorado para filas del dashboard con animaciones y tipos consistentes
 */
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
  showAnimation = true,
  animationDelay = 0,
}) => {
  const Root = onClick || onDoubleClick ? "button" : "div";
  const bgClass = variant === "stripe" ? "bg-token-surface-stripe" : "bg-token-surface-card";

  const content = (
    <Root
      {...(Root === "button" ? { type: "button" as const } : {})}
      onDoubleClick={onDoubleClick}
      onClick={(event) => {
        if (onClick) onClick();
        else if (event.detail === 0) onDoubleClick?.();
      }}
      className={`
        flex w-full text-left items-center justify-between p-3.5 rounded-sm border border-token-border-technical
        cursor-pointer transition-all group hover:border-token-accent-brand/40 ${bgClass} ${className}
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
          <p className="text-sm font-bold text-token-text-primary truncate leading-tight">
            {title}
          </p>
          <p className="text-xxs font-bold text-token-text-tertiary uppercase tracking-widest leading-none">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {extra && <div className="text-right">{extra}</div>}
        {indicator && <div className="flex items-center">{indicator}</div>}
      </div>
    </Root>
  );

  if (!showAnimation) {
    return content;
  }

  return (
    <div
      style={animationDelay > 0 ? { animationDelay: `${animationDelay}s` } : undefined}
      className="animate-in fade-in slide-in-from-bottom-2 duration-200 transition-transform hover:scale-[1.01] active:scale-[0.99]"
    >
      {content}
    </div>
  );
};

export default DashboardRow;
