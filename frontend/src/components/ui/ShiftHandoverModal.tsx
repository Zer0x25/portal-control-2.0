import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShiftHandoverData } from "../../types/index";
import Button from "./Button";
import {
  CloseIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from "./icons/index";
import { formatDisplayDateTime } from "../../utils/formatters";

interface ShiftHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ShiftHandoverData | null;
}

const ShiftHandoverModal: React.FC<ShiftHandoverModalProps> = ({ isOpen, onClose, data }) => {
  return createPortal(
    <AnimatePresence>
      {isOpen && data && (
        <div className="fixed inset-0 z-150 flex items-center justify-center p-4 md:p-8">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            className="relative w-full max-w-3xl max-h-[92vh] bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Cinematic */}
            <div className="p-8 pb-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-sap-blue/10 flex items-center justify-center text-sap-blue border border-sap-blue/20">
                  <InformationCircleIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight italic">
                    Relevo de Turno
                  </h2>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-0.5">
                    Resumen Operativo Saliente
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500 rounded-xl transition-all"
              >
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="grow overflow-y-auto p-8 space-y-8 scrollbar-premium">
              {/* Turno Info Card */}
              <div className="bg-gray-50/50 dark:bg-white/5 p-6 rounded-4xl border border-gray-100 dark:border-white/5 relative overflow-hidden group">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-[10px] font-black text-sap-blue uppercase tracking-widest mb-1">
                      Turno Anterior
                    </h4>
                    <p className="text-xl font-black text-gray-900 dark:text-gray-100 italic">
                      {data.responsibleUser}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end text-gray-400 mb-1">
                      <ClockIcon className="w-3 h-3" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Finalizado
                      </span>
                    </div>
                    <p className="text-sm font-bold text-gray-600 dark:text-gray-400">
                      {formatDisplayDateTime(data.endTime)}
                    </p>
                  </div>
                </div>
                <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-sap-blue/5 rounded-full blur-2xl group-hover:bg-sap-blue/10 transition-all" />
              </div>

              {/* Automatic Closures / Alerts */}
              {data.automaticClosures.length > 0 && (
                <div className="bg-red-500/5 dark:bg-red-500/10 p-6 rounded-4xl border border-red-500/20">
                  <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4 animate-pulse" />
                    Alertas Críticas del Sistema
                  </h4>
                  <div className="space-y-3">
                    {data.automaticClosures.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex gap-3 items-start p-3 bg-white/50 dark:bg-black/20 rounded-xl border border-red-500/10"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                        <p className="text-sm font-medium text-red-900 dark:text-red-200 leading-relaxed italic">
                          {entry.annotation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Log Entries / Novedades */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-sap-blue" />
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">
                    Bitácora de Novedades
                  </h4>
                </div>

                {data.logEntries.length > 0 ? (
                  <div className="space-y-3 pr-2">
                    {data.logEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex gap-4 p-4 bg-gray-50/30 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-sap-blue/20 transition-all"
                      >
                        <div className="text-[10px] font-black text-sap-blue dark:text-sap-light-blue font-mono whitespace-nowrap pt-0.5">
                          {entry.time}
                        </div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-relaxed">
                          {entry.annotation}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center opacity-40">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest italic">
                      Sin novedades registradas
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 bg-gray-50/50 dark:bg-black/20 border-t border-gray-100 dark:border-white/5 flex justify-end shrink-0">
              <Button
                onClick={onClose}
                className="px-10 rounded-2xl bg-sap-blue text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20 h-12"
              >
                Entendido
              </Button>
            </div>

            {/* Decorative background blur */}
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-sap-blue/5 rounded-full blur-3xl pointer-events-none" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default ShiftHandoverModal;
