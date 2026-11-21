import React, { ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "./icons";
import { Z } from "../../constants/zScale";
import { useDialogA11y } from "../../hooks/useDialogA11y";

interface CinematicModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showHeader?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  testId?: string;
  overlayClassName?: string;
  panelClassName?: string;
  bodyClassName?: string;
  zClass?: string;
}

const EXIT_DURATION_MS = 150;

/** CSS-first modal: GPU entry/exit via Tailwind animate-in/out + focus trap. */
const CinematicModal: React.FC<CinematicModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-2xl",
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  showHeader = true,
  ariaLabel,
  ariaLabelledBy,
  testId = "modal-dialog",
  overlayClassName = "bg-black/60 backdrop-blur-sm p-4",
  panelClassName,
  bodyClassName = "p-6 overflow-y-auto custom-scrollbar max-h-[85vh]",
  zClass = Z.max,
}) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(isOpen);
  const [closing, setClosing] = useState(false);

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

  useDialogA11y({ isOpen, isActive: rendered && !closing, onClose, closeOnEscape, panelRef });

  if (typeof document === "undefined" || !rendered) return null;

  const panelAnim = closing
    ? "animate-out fade-out zoom-out-95"
    : "animate-in fade-in zoom-in-95 slide-in-from-bottom-2";
  const defaultRounded = panelClassName?.includes("rounded-") ? "" : "rounded-lg";
  const defaultBorder = panelClassName?.includes("border-token-")
    ? ""
    : "border-token-border-technical";
  const defaultOverflow = panelClassName?.includes("overflow-") ? "" : "overflow-hidden";
  const headerTitleClassName =
    "text-lg font-black text-token-text-primary flex items-center gap-3 uppercase tracking-tight";
  const isTextTitle = typeof title === "string" || typeof title === "number";
  return createPortal(
    <div
      className={`fixed inset-0 ${zClass} flex items-center justify-center ${overlayClassName} ${closing ? "animate-out fade-out" : "animate-in fade-in"}`}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        data-testid={testId}
        className={`bg-token-surface-card ${defaultRounded} border ${defaultBorder} shadow-2xl w-full ${maxWidth} ${defaultOverflow} ${panelAnim}${panelClassName ? ` ${panelClassName}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy ?? (showHeader ? titleId : undefined)}
        onClick={(e) => e.stopPropagation()}
      >
        {showHeader && (
          <div className="flex justify-between items-center px-6 py-4 border-b border-token-border-subtle bg-token-surface-header">
            {isTextTitle ? (
              <h2 id={titleId} className={headerTitleClassName}>
                {title}
              </h2>
            ) : (
              <div id={titleId} className={headerTitleClassName}>
                {title}
              </div>
            )}
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
        )}
        <div className={bodyClassName}>{children}</div>
      </div>
    </div>,
    document.body,
  );
};

export default CinematicModal;
