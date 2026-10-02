import React, { useState, useEffect } from "react";
import { API_ORIGIN_URL } from "../../services/apiBase";

const SimpleConnectionIndicator: React.FC = () => {
  const [status, setStatus] = useState<"healthy" | "degraded" | "offline">("offline");
  const [isChecking, setIsChecking] = useState<boolean>(true);

  useEffect(() => {
    const healthUrl = `${API_ORIGIN_URL}/api/health`;

    const checkConnection = async () => {
      try {
        const response = await fetch(healthUrl);
        if (response.status === 200) {
          const body = await response.json();
          if (body.data?.status === "degraded") {
            setStatus("degraded");
          } else {
            setStatus("healthy");
          }
        } else if (response.status === 503) {
          setStatus("offline"); // 503 now means DB is down, which is effectively offline for the app
        } else {
          setStatus("offline");
        }
      } catch {
        setStatus("offline");
      } finally {
        setIsChecking(false);
      }
    };

    // Initial check
    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  if (isChecking) {
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
          textClass: "text-emerald-400 dark:text-emerald-300",
          bgClass: "bg-emerald-500/10",
        };
      case "degraded":
        return {
          color: "bg-amber-500",
          shadow: "shadow-[0_0_12px_rgba(245,158,11,0.4)]",
          label: "Sincronización en Alerta",
          textClass: "text-amber-400",
          bgClass: "bg-amber-500/10",
        };
      default:
        return {
          color: "bg-red-500",
          shadow: "shadow-[0_0_12px_rgba(239,68,68,0.4)]",
          label: "Servidor Desconectado",
          textClass: "text-red-400",
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
