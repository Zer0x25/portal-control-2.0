import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloseIcon, InformationCircleIcon } from "./icons/index";
import easterEggImg from "../../assets/images/Mini_Zer0x.jpg";
import CinematicModal from "./CinematicModal";

interface AboutModalViewProps {
  isOpen: boolean;
  onClose: () => void;
  showMonkey: boolean;
  onCloseMonkey: () => void;
  onLogoClick: () => void;
}

const AboutModalView: React.FC<AboutModalViewProps> = ({
  isOpen,
  onClose,
  showMonkey,
  onCloseMonkey,
  onLogoClick,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <CinematicModal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sap-blue/10 rounded-xl">
              <InformationCircleIcon className="w-5 h-5 text-sap-blue" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-950 dark:text-white uppercase tracking-tight italic leading-none">
                Información del Sistema
              </h3>
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mt-1 italic leading-none">
                Portal Modernizado v3.0
              </p>
            </div>
          </div>
        }
        maxWidth="max-w-xl"
      >
        <div className="space-y-8 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-sap-blue/5 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center space-y-4 relative">
            <div
              onClick={onLogoClick}
              className="w-20 h-20 bg-gradient-to-br from-sap-blue to-indigo-600 rounded-3xl mx-auto flex items-center justify-center shadow-22xl shadow-blue-500/20 group hover:scale-110 transition-transform duration-500 cursor-pointer"
            >
              <span className="text-white font-black text-4xl italic tracking-tighter">P</span>
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter italic">
                PORTAL
              </h2>
              <p className="text-[10px] font-black text-sap-blue uppercase tracking-[0.4em] italic leading-none opacity-60">
                Control & Command
              </p>
            </div>
          </div>

          <div className="space-y-4 relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50/50 dark:bg-white/[0.02] p-4 rounded-3xl border border-gray-100 dark:border-white/5 group hover:border-sap-blue/20 transition-all">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1 italic">
                  Versión Nucleus
                </span>
                <span className="text-sm font-black text-gray-800 dark:text-gray-200 italic">
                  3.0.4-STABLE
                </span>
              </div>
              <div className="bg-gray-50/50 dark:bg-white/[0.02] p-4 rounded-3xl border border-gray-100 dark:border-white/5 group hover:border-sap-blue/20 transition-all">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1 italic">
                  Estado Kernel
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 italic">
                    OPTIMIZADO
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white/40 dark:bg-white/[0.02] p-6 rounded-4xl border border-gray-100 dark:border-white/5 space-y-4">
              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic border-b border-gray-100 dark:border-white/5 pb-2">
                Créditos de Desarrollo
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Arquitectura UI
                  </span>
                  <span className="text-xs font-black text-gray-800 dark:text-gray-200 italic">
                    Antigravity AI
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Core Engine
                  </span>
                  <span className="text-xs font-black text-gray-800 dark:text-gray-200 italic">
                    Google DeepMind
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center pt-4">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest opacity-50">
              © 2024 PORTAL SYSTEM • ALL RIGHTS RESERVED
            </p>
          </div>
        </div>
      </CinematicModal>

      <AnimatePresence>
        {showMonkey && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMonkey}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={easterEggImg}
                alt="Easter egg"
                className="max-h-[85vh] max-w-[90vw] rounded-3xl shadow-4xl border-4 border-white/10"
              />
              <button
                onClick={onCloseMonkey}
                className="absolute -top-4 -right-4 bg-white text-black p-2 rounded-full shadow-2xl"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AboutModalView;
