import React from "react";

interface IndustrialIndicatorProps {
  color?: string; // e.g., "bg-sap-blue", "bg-emerald-500"
  height?: string; // e.g., "h-10", "h-full"
  className?: string;
}

/**
 * Vertical colored bar used to indicate status or hierarchy in cards and list items.
 */
export const IndustrialIndicator: React.FC<IndustrialIndicatorProps> = ({
  color = "bg-sap-blue",
  height = "h-10",
  className = "",
}) => {
  return <div className={`w-1 ${height} ${color} rounded-sm ${className}`} aria-hidden="true" />;
};

interface LiveStatusProps {
  color?: string; // e.g., "bg-emerald-500", "bg-red-500"
  size?: string; // e.g., "w-2 h-2"
  className?: string;
}

/**
 * Pulsing dot indicating an active session, process, or real-time connection.
 */
export const LiveStatus: React.FC<LiveStatusProps> = ({
  color = "bg-emerald-500",
  size = "w-2 h-2",
  className = "",
}) => {
  return (
    <div className={`relative ${size} ${className}`} aria-hidden="true">
      <div className={`absolute inset-0 rounded-full ${color} animate-pulse opacity-75`} />
      <div className={`relative ${size} rounded-full ${color}`} />
    </div>
  );
};

interface SystemStatusIndicatorProps {
  label?: string;
  status?: "online" | "offline";
  className?: string;
}

/**
 * Standardized system status indicator for headers and titles.
 */
export const SystemStatusIndicator: React.FC<SystemStatusIndicatorProps> = ({
  label = "SISTEMA ACTIVO",
  status = "online",
  className = "",
}) => {
  const color = status === "online" ? "bg-emerald-500" : "bg-red-500";

  return (
    <div
      className={`
        flex items-center gap-2 px-2.5 py-1.5 rounded-sm
        bg-token-surface-stripe border border-token-border-subtle
        transition-all shadow-none ${className}
      `}
    >
      <LiveStatus color={color} size="w-1.5 h-1.5" />
      <span className="text-[8px] font-bold tracking-[0.2em] text-token-text-tertiary uppercase leading-none">
        {label}
      </span>
    </div>
  );
};
