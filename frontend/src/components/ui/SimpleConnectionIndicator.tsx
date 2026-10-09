import React from "react";
import { useHealthQuery, deriveBackendStatus } from "../../hooks/queries/useHealthQuery";

const SimpleConnectionIndicator: React.FC = () => {
  const { data, error, isLoading } = useHealthQuery();
  const status = deriveBackendStatus(data, error, isLoading);

  if (isLoading && !data && !error) {
    return (
      <div className="flex items-center md:space-x-2 bg-white/10 backdrop-blur-sm p-1.5 md:p-2 rounded-xl">
        <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse" />
        <span className="hidden md:block text-[10px] font-black text-white uppercase tracking-widest">
          Conectando...
        </span>
      </div>
    );
  }

  const getStatusConfig = () => {
    switch (status) {
      case "healthy":
        return {
          color: "bg-green-500",
          shadow: "shadow-[0_0_12px_rgba(34,197,94,0.4)]",
          label: "Conectado",
          textClass: "text-emerald-700 dark:text-emerald-300",
          bgClass: "bg-emerald-500/10",
        };
      case "degraded":
        return {
          color: "bg-amber-500",
          shadow: "shadow-[0_0_12px_rgba(245,158,11,0.4)]",
          label: "Sincronización en Alerta",
          textClass: "text-amber-700 dark:text-amber-400",
          bgClass: "bg-amber-500/10",
        };
      default:
        return {
          color: "bg-red-500",
          shadow: "shadow-[0_0_12px_rgba(239,68,68,0.4)]",
          label: "Servidor Desconectado",
          textClass: "text-red-700 dark:text-red-400",
          bgClass: "bg-red-500/10",
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
