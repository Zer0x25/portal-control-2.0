import React from "react";
import { ShieldIcon } from "./icons";

const SessionExpiredOverlay: React.FC = () => {
  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-token-surface-card rounded-2xl p-8 shadow-2xl max-w-md w-full text-center border border-token-border-subtle relative overflow-hidden animate-in fade-in zoom-in-90">
        {/* Decorative background pulse */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/10 rounded-full blur-3xl animate-pulse" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6 animate-in fade-in zoom-in-95 [animation-delay:100ms]">
            <ShieldIcon className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>

          <h2 className="text-2xl font-black text-token-text-primary mb-2">Sesión Expirada</h2>

          <p className="text-token-text-secondary text-sm mb-8 px-4">
            Por tu seguridad, hemos cerrado tu sesión debido a inactividad o expiración de
            credenciales.
          </p>

          <div className="flex items-center gap-3 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-widest">
            <span className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
            Cerrando sesión de forma segura...
          </div>
        </div>

        {/* Loading Bar at bottom */}
        <div className="absolute bottom-0 left-0 h-1.5 w-full bg-linear-to-r from-red-500 to-orange-500" />
      </div>
    </div>
  );
};

export default SessionExpiredOverlay;
