import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../../store/useStore";
import { ArrowPathIcon } from "./icons";

/**
 * InitialSyncOverlay: The definitive "Industrial-Elegant" transition screen.
 * Used during the first data synchronization after login or hard refresh.
 */
const InitialSyncOverlay: React.FC = () => {
  const isInitialSync = useStore((state) => state.isInitialSync);
  const syncProgress = useStore((state) => state.syncProgress);
  const currentSyncStep = useStore((state) => state.currentSyncStep);

  return (
    <AnimatePresence>
      {isInitialSync && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02, filter: "blur(20px)" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-99999 flex flex-col items-center justify-center bg-token-surface-app overflow-hidden"
        >
          {/* Decorative Technical Background - Unified with Login */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-token-surface-app/95 z-0" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-screen h-screen bg-[radial-gradient(circle_at_center,rgba(0,87,146,0.12)_0%,transparent_70%)] z-0" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-size-[40px_40px] mask-[radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-45"></div>
          </div>

          <div className="z-10 text-center relative max-w-md w-full px-8">
            {/* Main Animated Status Indicator */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative mb-12"
            >
              {/* Outer Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-sap-blue blur-3xl opacity-10 animate-pulse"></div>

              {/* Technical Spinner */}
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 border-2 border-token-border-subtle rounded-full"></div>
                <motion.div
                  className="absolute inset-0 border-2 border-transparent border-t-sap-blue rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                />
                <div className="absolute inset-4 border border-sap-blue/20 rounded-full flex items-center justify-center">
                  <div style={{ animationDuration: "3s" }} className="animate-spin">
                    <ArrowPathIcon className="w-5 h-5 text-sap-blue/40" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Status Information */}
            <div className="space-y-6">
              <div className="flex flex-col gap-1">
                <p className="text-[11px] font-semibold text-token-text-tertiary uppercase tracking-[0.4em] animate-pulse">
                  Sincronizando Entorno
                </p>
                <h2 className="text-xl font-bold text-token-text-primary tracking-tight">
                  Inicializando <span className="text-sap-blue">Portal Core</span>
                </h2>
              </div>

              {/* Progress Section - Fluid / No Card */}
              <div className="mt-8 space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-[11px] font-bold text-token-text-secondary uppercase tracking-[0.2em]">
                    {currentSyncStep || "Preparando entorno seguro..."}
                  </span>
                  <span className="text-[13px] font-mono font-black text-sap-blue">
                    {syncProgress}%
                  </span>
                </div>

                <div className="h-[2px] w-full bg-token-surface-stripe overflow-hidden">
                  <motion.div
                    className="h-full bg-sap-blue shadow-[0_0_15px_rgba(0,87,146,0.6)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${syncProgress}%` }}
                    transition={{ ease: "easeOut", duration: 0.5 }}
                  />
                </div>

                {/* Discreet handshaking log */}
                <p className="text-[9px] font-medium text-token-text-tertiary uppercase tracking-widest opacity-40">
                  Establishing technical handshake • Validating integrity...
                </p>
              </div>
            </div>
          </div>

          {/* Footer Version Info */}
          <div className="fixed bottom-10 left-0 w-full text-center">
            <div className="flex items-center justify-center gap-4 opacity-20">
              <div className="h-px w-12 bg-token-text-tertiary"></div>
              <span className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-[0.3em]">
                Enterprise Portal v3.0
              </span>
              <div className="h-px w-12 bg-token-text-tertiary"></div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InitialSyncOverlay;
