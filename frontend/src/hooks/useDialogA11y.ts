import { useEffect, RefObject } from "react";

export const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface UseDialogA11yOptions {
  isOpen: boolean;
  isActive?: boolean;
  onClose: () => void;
  closeOnEscape?: boolean;
  panelRef: RefObject<HTMLElement | null>;
}

/**
 * Shared accessibility behavior for dialog & drawer primitives:
 * Escape dismissal, initial panel focus, Tab/Shift+Tab focus trap, and focus restoration.
 */
export function useDialogA11y({
  isOpen,
  isActive = isOpen,
  onClose,
  closeOnEscape = true,
  panelRef,
}: UseDialogA11yOptions): void {
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  useEffect(() => {
    if (!isActive) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.focus({ preventScroll: true });

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)];
      if (items.length === 0) return event.preventDefault();
      const [first, last] = [items[0], items[items.length - 1]];
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
  }, [isActive, panelRef]);
}
