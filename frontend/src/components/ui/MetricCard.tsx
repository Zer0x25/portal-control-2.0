import React, { ReactNode } from "react";

/**
 * MetricCard: unica primitiva de tarjeta de metrica del design system
 * (spec 031 T13 / AC9). Reemplaza a KpiCard y MetricCard como componentes
 * separados.
 *
 * - `kind="metric"`: ficha autonoma (title, value, label, trend, icon, tone).
 * - `kind="panel"`: contenedor con icono y contenido libre (children).
 *
 * El tono es un union type (`MetricTone`): no hay parsing de strings en
 * runtime ni colores crudos; todo pasa por tokens semanticos.
 */
export type MetricTone = "success" | "accent" | "warning" | "danger" | "neutral";

const TONE_STYLES: Record<MetricTone, { dot: string; bg: string; border: string; text: string }> = {
  success: {
    dot: "bg-token-status-success",
    bg: "bg-token-status-success/10",
    border: "border-token-status-success/20",
    text: "text-token-status-success",
  },
  accent: {
    dot: "bg-token-accent-brand",
    bg: "bg-token-accent-brand/10",
    border: "border-token-accent-brand/20",
    text: "text-token-accent-brand",
  },
  warning: {
    dot: "bg-token-status-warning",
    bg: "bg-token-status-warning/10",
    border: "border-token-status-warning/20",
    text: "text-token-status-warning",
  },
  danger: {
    dot: "bg-token-status-error",
    bg: "bg-token-status-error/10",
    border: "border-token-status-error/20",
    text: "text-token-status-error",
  },
  neutral: {
    dot: "bg-token-text-tertiary",
    bg: "bg-token-surface-active",
    border: "border-token-border-subtle",
    text: "text-token-text-secondary",
  },
};

interface MetricCardBase {
  className?: string;
}

export interface MetricTileProps extends MetricCardBase {
  kind?: "metric";
  title: string;
  value: string | number;
  label?: string;
  icon?: ReactNode;
  trend?: {
    value: string | number;
    isPositive: boolean;
  };
  tone?: MetricTone;
  onClick?: () => void;
}

export interface MetricPanelProps extends MetricCardBase {
  kind: "panel";
  title: string | ReactNode;
  icon: ReactNode;
  children: ReactNode;
}

export type MetricCardProps = MetricTileProps | MetricPanelProps;

const MetricTile: React.FC<MetricTileProps> = ({
  title,
  value,
  label,
  icon,
  trend,
  tone = "accent",
  className = "",
  onClick,
}) => {
  const theme = TONE_STYLES[tone];

  return (
    <div
      onClick={onClick}
      className={`
        @container animate-in fade-in duration-150 relative flex flex-col p-3 rounded-md border border-token-border-subtle shadow-none transition-all duration-150
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
        <h2 className="text-2xl @sm:text-3xl font-bold text-token-text-primary tracking-tighter leading-none truncate text-center">
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
              className={`text-xxs font-bold ${trend.isPositive ? "text-token-status-success" : "text-token-status-error"} whitespace-nowrap text-center`}
            >
              {trend.isPositive ? "↑" : "↓"} {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

const MetricPanel: React.FC<MetricPanelProps> = ({ title, icon, children, className = "" }) => (
  <div
    className={`@container animate-in fade-in duration-150 relative overflow-hidden rounded-sm bg-token-surface-card border border-token-border-technical shadow-sm p-3 @sm:p-4 @lg:p-5 ${className}`}
  >
    <div className="flex items-center gap-4 mb-4">
      <div className="w-9 h-9 rounded-sm bg-token-accent-brand border border-token-accent-brand shadow-lg shadow-token-accent-brand/20 flex items-center justify-center shrink-0">
        {React.isValidElement<{ className?: string }>(icon)
          ? React.cloneElement(icon, { className: "w-4.5 h-4.5 text-white" })
          : icon}
      </div>
      <div className="flex-1">
        {typeof title === "string" ? (
          <h4 className="text-[13px] font-bold text-token-text-primary leading-tight">{title}</h4>
        ) : (
          title
        )}
        <div className="h-0.5 w-6 bg-token-accent-brand mt-1.5 opacity-30" />
      </div>
    </div>

    <div className="space-y-1">{children}</div>
  </div>
);

const MetricCard: React.FC<MetricCardProps> = (props) => {
  if (props.kind === "panel") {
    return <MetricPanel {...props} />;
  }
  return <MetricTile {...props} />;
};

export interface MetricStatProps {
  value: string | number;
  label: string;
  onClick?: () => void;
  isActive?: boolean;
}

/** Fila de estadistica dentro de un `MetricCard kind="panel"`. */
export const MetricStat: React.FC<MetricStatProps> = ({ value, label, onClick, isActive }) => {
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

export { MetricCard };
export default MetricCard;
