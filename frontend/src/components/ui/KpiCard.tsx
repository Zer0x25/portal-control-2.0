import React, { ReactNode } from "react";

/**
 * 🏢 KpiCard: Contenedor Industrial de Métricas
 * Refactorizado para el estándar "Industrial-Elegant"
 */
interface KpiCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: string | ReactNode;
  children: ReactNode;
  icon: ReactNode;
}

const KpiCard = React.forwardRef<HTMLDivElement, KpiCardProps>(
  ({ title, children, icon, className, ...rest }, ref) => {
    const { onClick, onMouseEnter, onMouseLeave, id } = rest;

    return (
      <div
        ref={ref}
        id={id}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`animate-in fade-in duration-150 relative overflow-hidden rounded-sm bg-token-surface-card border border-token-border-technical shadow-sm p-4 md:p-5 ${className || ""}`}
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-9 h-9 rounded-sm bg-token-accent-brand border border-token-accent-brand shadow-lg shadow-token-accent-brand/20 flex items-center justify-center shrink-0">
            {React.isValidElement(icon)
              ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
                  className: "w-4.5 h-4.5 text-white",
                })
              : icon}
          </div>
          <div className="flex-1">
            {typeof title === "string" ? (
              <h4 className="text-[13px] font-bold text-token-text-primary leading-tight">
                {title}
              </h4>
            ) : (
              title
            )}
            <div className="h-0.5 w-6 bg-token-accent-brand mt-1.5 opacity-30" />
          </div>
        </div>

        <div className="space-y-1">{children}</div>
      </div>
    );
  },
);

export interface KpiStatProps {
  value: string | number;
  label: string;
  onClick?: () => void;
  isActive?: boolean;
}

export const KpiStat: React.FC<KpiStatProps> = ({ value, label, onClick, isActive }) => {
  const isClickable = !!onClick;

  const content = (
    <div className="flex justify-between items-center w-full gap-3">
      <span
        className={`text-[11px] font-medium transition-colors ${
          isActive ? "text-white" : "text-token-text-tertiary"
        }`}
      >
        {label}
      </span>
      <span
        className={`text-lg font-black tabular-nums tracking-tighter transition-colors ${
          isActive ? "text-white" : "text-token-text-primary group-hover:text-token-accent-brand"
        }`}
      >
        {value}
      </span>
    </div>
  );

  if (isClickable) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`group relative flex items-center w-full py-2.5 px-3.5 rounded-sm transition-all duration-150 border active:scale-[0.98] ${
          isActive
            ? "bg-token-accent-brand border-token-accent-brand shadow-md text-white"
            : "bg-token-surface-stripe border-token-border-subtle hover:border-token-border-focus hover:bg-token-surface-active"
        }`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex justify-between items-center py-2 px-1 border-b border-token-border-subtle last:border-b-0">
      {content}
    </div>
  );
};

export default KpiCard;
