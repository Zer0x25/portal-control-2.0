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
            className="relative w-full max-w-3xl max-h-[92vh] bg-token-surface-card rounded-lg shadow-2xl border border-token-border-technical overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Cinematic */}
            <div className="p-8 pb-6 border-b border-token-border-subtle flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-token-accent-brand/10 flex items-center justify-center text-token-accent-brand border border-token-accent-brand/20">
                  <InformationCircleIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-token-text-primary uppercase tracking-tight italic">
                    Relevo de Turno
                  </h2>
                  <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-[0.3em] mt-0.5">
                    Resumen Operativo Saliente
                  </p>
                </div>
              </div>

              <Button
                variant="none"
                onClick={onClose}
                className="p-2 hover:bg-token-surface-hover text-token-text-tertiary hover:text-token-status-error rounded-md transition-all shadow-none"
              >
                <CloseIcon className="w-6 h-6" />
              </Button>
            </div>

            <div className="grow overflow-y-auto p-8 space-y-8 scrollbar-premium">
              {/* Turno Info Card */}
              <div className="bg-token-surface-stripe p-6 rounded-md border border-token-border-subtle relative overflow-hidden group">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-[10px] font-black text-token-accent-brand uppercase tracking-widest mb-1">
                      Turno Anterior
                    </h4>
                    <p className="text-xl font-black text-token-text-primary italic">
                      {data.responsibleUser}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end text-token-text-tertiary mb-1">
                      <ClockIcon className="w-3 h-3" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Finalizado
                      </span>
                    </div>
                    <p className="text-sm font-bold text-token-text-secondary">
                      {formatDisplayDateTime(data.endTime)}
                    </p>
                  </div>
                </div>
                <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-token-accent-brand/5 rounded-full blur-2xl group-hover:bg-token-accent-brand/10 transition-all" />
              </div>

              {/* Automatic Closures / Alerts */}
              {data.automaticClosures.length > 0 && (
                <div className="bg-token-status-error/5 p-6 rounded-md border border-token-status-error/20">
                  <h4 className="text-[10px] font-black text-token-status-error uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4 animate-pulse" />
                    Alertas Críticas del Sistema
                  </h4>
                  <div className="space-y-3">
                    {data.automaticClosures.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex gap-3 items-start p-3 bg-token-surface-card rounded-md border border-token-status-error/10"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-token-status-error mt-1.5 shrink-0" />
                        <p className="text-sm font-medium text-token-status-error leading-relaxed italic">
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
                  <div className="w-1.5 h-1.5 rounded-full bg-token-accent-brand" />
                  <h4 className="text-[10px] font-black text-token-text-secondary uppercase tracking-[0.3em]">
                    Bitácora de Novedades
                  </h4>
                </div>

                {data.logEntries.length > 0 ? (
                  <div className="space-y-3 pr-2">
                    {data.logEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex gap-4 p-4 bg-token-surface-stripe rounded-md border border-token-border-subtle hover:border-token-accent-brand/20 transition-all"
                      >
                        <div className="text-[10px] font-black text-token-accent-brand font-mono whitespace-nowrap pt-0.5">
                          {entry.time}
                        </div>
                        <p className="text-sm font-medium text-token-text-primary leading-relaxed">
                          {entry.annotation}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center opacity-40">
                    <p className="text-xs font-black text-token-text-tertiary uppercase tracking-widest italic">
                      Sin novedades registradas
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 bg-token-surface-stripe border-t border-token-border-subtle flex justify-end shrink-0">
              <Button
                variant="primary"
                onClick={onClose}
                className="px-10 rounded-md font-black uppercase text-xs tracking-widest h-12"
              >
                Entendido
              </Button>
            </div>

            {/* Decorative background blur */}
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-token-accent-brand/5 rounded-full blur-3xl pointer-events-none" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default ShiftHandoverModal;
