import React from "react";
import { motion } from "framer-motion";

interface LoadingOverlayProps {
  message?: string;
  /** If true, uses fixed positioning covering the entire screen. Default: false (relative to parent) */
  fullScreen?: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message, fullScreen = true }) => {
  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="z-100 flex flex-col items-center justify-center p-12 bg-token-surface-card border border-token-border-technical rounded-sm shadow-2xl relative overflow-hidden"
    >
      {/* Subtle tech background for the card */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,87,146,0.03)_0%,transparent_100%)] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center">
        <div className="relative w-10 h-10 mb-8">
          <div className="absolute inset-0 border-2 border-token-border-subtle rounded-full opacity-20"></div>
          <motion.div
            className="absolute inset-0 border-2 border-transparent border-t-sap-blue rounded-full"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          />
          <div className="absolute inset-2 rounded-full bg-sap-blue/5 flex items-center justify-center">
            <motion.div
              animate={{ scale: [0.8, 1.1, 0.8] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="w-8 h-8 rounded-full bg-sap-blue/20"
            />
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-gray-900 dark:text-white font-black text-sm uppercase tracking-widest leading-tight"
        >
          {message}
        </motion.p>
        <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-tighter">
          Un momento por favor
        </p>
      </div>
    </motion.div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-99999 flex items-center justify-center bg-token-surface-stripe/60 backdrop-blur-sm p-4">
        {content}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-token-surface-stripe/40 backdrop-blur-[2px]">
      {content}
    </div>
  );
};

export default LoadingOverlay;
