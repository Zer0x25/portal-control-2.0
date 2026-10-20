import React from "react";
import { useStore } from "../../store/useStore";
import { ArrowPathIcon } from "./icons/index";
import LoadingSpinner from "./LoadingSpinner";

const BackgroundActivitySpinner: React.FC = () => {
  const isProcessing = useStore((state) => state.isProcessing);

  return (
    <>
      {isProcessing && (
        <div className="fixed top-14 right-6 z-100 flex items-center gap-3 bg-token-surface-card/80 backdrop-blur-md border border-token-border-technical p-2 pr-4 rounded-full shadow-lg shadow-black/20 pointer-events-none animate-in fade-in slide-in-from-right-4">
          <div className="relative flex items-center justify-center">
            <LoadingSpinner size="sm" variant="default" />
            <ArrowPathIcon className="absolute w-3 h-3 text-sap-blue opacity-50" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-token-text-primary uppercase tracking-[0.2em] leading-none">
              Procesando
            </span>
            <span className="text-[7px] font-bold text-token-text-tertiary uppercase tracking-widest leading-none mt-1">
              Actividad en Segundo Plano
            </span>
          </div>
        </div>
      )}
    </>
  );
};

export default BackgroundActivitySpinner;
