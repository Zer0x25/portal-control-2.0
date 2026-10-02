import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../../store/useStore";
import { ArrowPathIcon } from "./icons/index";

const BackgroundActivitySpinner: React.FC = () => {
  const isProcessing = useStore((state) => state.isProcessing);

  return (
    <AnimatePresence>
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0, x: 20, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.8 }}
          className="fixed top-14 right-6 z-[100] flex items-center gap-3 bg-token-surface-card/80 backdrop-blur-md border border-token-border-technical p-2 pr-4 rounded-full shadow-lg shadow-black/20 pointer-events-none"
        >
          <div className="relative flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-sap-blue/20 border-t-sap-blue animate-spin" />
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
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BackgroundActivitySpinner;
