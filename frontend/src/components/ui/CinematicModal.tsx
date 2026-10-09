import React, { ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CloseIcon } from "./icons";

interface CinematicModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  maxWidth?: string; // e.g., "max-w-2xl"
  showCloseButton?: boolean;
}

const CinematicModal: React.FC<CinematicModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-2xl",
  showCloseButton = true,
}) => {
  // We use a Portal to ensure the modal is always at the top of the DOM hierarchy
  if (typeof document === "undefined") return null;

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className={`bg-token-surface-card rounded-lg border border-token-border-technical shadow-2xl w-full ${maxWidth} overflow-hidden`}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-token-border-subtle bg-token-surface-header">
              <div className="text-lg font-black text-token-text-primary flex items-center gap-3 uppercase tracking-tight">
                {title}
              </div>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="p-1.5 rounded-md text-token-text-tertiary hover:bg-token-surface-hover hover:text-token-text-primary border border-transparent hover:border-token-border-subtle transition-all active:scale-95"
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar max-h-[85vh]">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default CinematicModal;
