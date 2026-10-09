import React, { ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "./icons";

interface CinematicModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  maxWidth?: string; // e.g., "max-w-2xl"
  showCloseButton?: boolean;
}

const EXIT_DURATION_MS = 150;

/**
 * CSS-first modal (no framer-motion): GPU entry/exit via Tailwind
 * `animate-in/out` utilities + lightweight focus trap with focus return.
 */
const CinematicModal: React.FC<CinematicModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-2xl",
  showCloseButton = true,
}) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(isOpen);
  const [closing, setClosing] = useState(false);

  // Mount on open; keep mounted 150ms on close for the exit animation.
  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      setClosing(false);
      return;
    }
    if (!rendered) return;
    setClosing(true);
    const timer = setTimeout(() => {
      setRendered(false);
      setClosing(false);
    }, EXIT_DURATION_MS);
    return () => clearTimeout(timer);
  }, [isOpen, rendered]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap with return of focus to the opener.
  useEffect(() => {
    if (!rendered || closing) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.focus({ preventScroll: true });

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !panel) return;
      const items = [
        ...panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => {
      document.removeEventListener("keydown", handleTab);
      previous?.focus?.();
    };
  }, [rendered, closing]);

  // We use a Portal to ensure the modal is always at the top of the DOM hierarchy
  if (typeof document === "undefined" || !rendered) return null;

  const overlayAnimation = closing ? "animate-out fade-out" : "animate-in fade-in";
  const panelAnimation = closing
    ? "animate-out fade-out zoom-out-95"
    : "animate-in fade-in zoom-in-95 slide-in-from-bottom-2";

  return createPortal(
    <div
      className={`fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 ${overlayAnimation}`}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`bg-token-surface-card rounded-lg border border-token-border-technical shadow-2xl w-full ${maxWidth} overflow-hidden ${panelAnimation}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-token-border-subtle bg-token-surface-header">
          <div
            id={titleId}
            className="text-lg font-black text-token-text-primary flex items-center gap-3 uppercase tracking-tight"
          >
            {title}
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="p-1.5 rounded-md text-token-text-tertiary hover:bg-token-surface-hover hover:text-token-text-primary border border-transparent hover:border-token-border-subtle transition active:scale-95"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar max-h-[85vh]">{children}</div>
      </div>
    </div>,
    document.body,
  );
};

export default CinematicModal;
