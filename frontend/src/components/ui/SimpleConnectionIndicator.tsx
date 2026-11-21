import React from "react";
import { useReadinessQuery, deriveReadinessStatus } from "../../hooks/queries/useHealthQuery";

const SimpleConnectionIndicator: React.FC = () => {
  const { data, error, isLoading } = useReadinessQuery();
  const status = deriveReadinessStatus(data, error, isLoading);

  if (isLoading && !data && !error) {
    return (
      <div className="flex items-center md:space-x-2 bg-white/10 backdrop-blur-sm p-1.5 md:p-2 rounded-xl">
        <div className="h-3 w-3 rounded-full bg-token-status-warning animate-pulse" />
        <span className="hidden md:block text-[10px] font-black text-token-text-primary uppercase tracking-widest">
          Conectando...
        </span>
      </div>
    );
  }

  const getStatusConfig = () => {
    switch (status) {
      case "healthy":
        return {
          color: "bg-token-status-success",
          shadow: "shadow-[0_0_12px_rgba(34,197,94,0.4)]",
          label: "Conectado",
          textClass: "text-token-status-success-text",
          bgClass: "bg-token-status-success-surface",
        };
      case "degraded":
        return {
          color: "bg-token-status-warning",
          shadow: "shadow-[0_0_12px_rgba(245,158,11,0.4)]",
          label: "Sincronización en Alerta",
          textClass: "text-token-status-warning-text",
          bgClass: "bg-token-status-warning-surface",
        };
      default:
        return {
          color: "bg-token-status-error",
          shadow: "shadow-[0_0_12px_rgba(239,68,68,0.4)]",
          label: "Servidor Desconectado",
          textClass: "text-token-status-error-text",
          bgClass: "bg-token-status-error-surface",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={`flex items-center md:space-x-2 backdrop-blur-sm p-1.5 md:p-2 rounded-xl transition-all duration-500 ${config.bgClass}`}
    >
      <div
        className={`h-3 w-3 rounded-full shadow-lg transition-all duration-500 ${config.color} ${config.shadow} ${status !== "healthy" ? "animate-pulse" : ""}`}
      />
      <span
        className={`hidden md:block text-[10px] font-black uppercase tracking-widest ${config.textClass}`}
      >
        {config.label}
      </span>
    </div>
  );
};

export default SimpleConnectionIndicator;
