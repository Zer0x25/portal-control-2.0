import React, { ReactNode, useRef } from "react";
import { createPortal } from "react-dom";
import { Z } from "../../constants/zScale";
import { useDialogA11y } from "../../hooks/useDialogA11y";

export interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  maxWidth?: string;
  zClass?: string;
  backdropZClass?: string;
  backdropClassName?: string;
  panelClassName?: string;
  closeOnEscape?: boolean;
  testId?: string;
}

/**
 * Accessible right-hand sliding drawer primitive with shared Escape handling,
 * initial focus, focus trap, and focus restoration.
 */
const SideDrawer: React.FC<SideDrawerProps> = ({
  isOpen,
  onClose,
  children,
  ariaLabel,
  ariaLabelledBy,
  maxWidth = "max-w-lg",
  zClass = Z.modal,
  backdropZClass = Z.overlay,
  backdropClassName = "bg-black/40 backdrop-blur-sm animate-in fade-in",
  panelClassName = "bg-token-surface-card shadow-2xl border-l border-token-border-technical animate-in fade-in slide-in-from-right [animation-duration:200ms]",
  closeOnEscape = true,
  testId,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useDialogA11y({ isOpen, onClose, closeOnEscape, panelRef });

  if (typeof document === "undefined" || !isOpen) return null;

  return createPortal(
    <>
      <div onClick={onClose} className={`fixed inset-0 ${backdropZClass} ${backdropClassName}`} />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        data-testid={testId}
        onClick={(e) => e.stopPropagation()}
        className={`fixed top-0 right-0 h-full w-full ${maxWidth} ${zClass} flex flex-col focus:outline-none ${panelClassName}`}
      >
        {children}
      </div>
    </>,
    document.body,
  );
};

export default SideDrawer;
