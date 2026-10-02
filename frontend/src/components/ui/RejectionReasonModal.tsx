import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "./Button";
import { CloseIcon } from "./icons/index";

interface RejectionReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isSubmitting?: boolean;
}

const RejectionReasonModal: React.FC<RejectionReasonModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
}) => {
  const [reason, setReason] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onConfirm(reason);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay sobrio y elegante (Sólido, sin Glassmorphism) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute inset-0 bg-token-text-primary/40 backdrop-blur-[2px]"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-token-surface-card rounded-sm shadow-2xl w-full max-w-lg overflow-hidden border border-token-border-technical"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rejection-modal-title"
          >
            {/* Header: Industrial Style */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-token-border-technical bg-token-surface-stripe">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
                  Acción Requerida
                </span>
                <h3
                  id="rejection-modal-title"
                  className="text-lg font-bold text-token-text-primary uppercase tracking-tight"
                >
                  Motivo de Rechazo
                </h3>
              </div>
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="p-2 rounded-sm text-token-text-tertiary hover:text-sap-blue hover:bg-sap-blue/10 transition-all disabled:opacity-30"
                aria-label="Cerrar modal"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                <label
                  htmlFor="rejection-reason"
                  className="text-[11px] font-semibold text-token-text-tertiary uppercase tracking-wider block"
                >
                  Justificación Técnica / Observaciones
                </label>
                <textarea
                  id="rejection-reason"
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isSubmitting}
                  className="block w-full px-4 py-3 border border-token-border-technical rounded-sm shadow-sm bg-token-surface-stripe text-token-text-primary focus:ring-1 focus:ring-sap-blue focus:border-sap-blue text-[13px] disabled:opacity-50 disabled:cursor-not-allowed resize-none transition-all placeholder:text-token-text-tertiary placeholder:opacity-50"
                  placeholder="Detalle el motivo del rechazo para el registro de auditoría..."
                  required
                />
              </div>

              <div className="px-6 py-4 bg-token-surface-stripe flex justify-end gap-3 border-t border-token-border-technical">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  loading={isSubmitting}
                  className="px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest shadow-md shadow-rose-500/10"
                >
                  Confirmar Rechazo
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RejectionReasonModal;
