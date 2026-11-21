import { useEffect, useRef, type RefObject } from "react";

interface ActiveModal {
  portal: HTMLElement;
  panel: HTMLElement;
}

const modalStack: ActiveModal[] = [];
const originalInert = new Map<HTMLElement, boolean>();
let observer: MutationObserver | undefined;

function updateBackground(): void {
  const top = modalStack.at(-1);
  for (const child of Array.from(document.body.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (!originalInert.has(child)) originalInert.set(child, child.hasAttribute("inert"));
    child.toggleAttribute("inert", child !== top?.portal || originalInert.get(child) === true);
  }
}

function releaseBackground(): void {
  observer?.disconnect();
  observer = undefined;
  for (const [element, wasInert] of originalInert) element.toggleAttribute("inert", wasInert);
  originalInert.clear();
}

/** Shared behavior for body-portal modal dialogs; the topmost dialog owns focus. */
export function useModalAccessibility(
  active: boolean,
  portalRef: RefObject<HTMLDivElement | null>,
  panelRef: RefObject<HTMLDivElement | null>,
  onClose: () => void,
  closeOnEscape = true,
): void {
  const closeRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);
  useEffect(() => {
    closeRef.current = onClose;
    closeOnEscapeRef.current = closeOnEscape;
  }, [onClose, closeOnEscape]);

  useEffect(() => {
    const portal = portalRef.current;
    const panel = panelRef.current;
    if (!active || !portal || !panel) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const entry = { portal, panel };
    modalStack.push(entry);
    updateBackground();
    if (!observer) {
      observer = new MutationObserver(updateBackground);
      observer.observe(document.body, { childList: true });
    }
    panel.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (modalStack.at(-1) !== entry) return;
      if (event.key === "Escape") {
        if (!closeOnEscapeRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (element) =>
          !element.closest('[hidden], [inert], [aria-hidden="true"]') && element.tabIndex >= 0,
      );
      const first = items[0];
      const last = items.at(-1);
      if (!first || !last) {
        event.preventDefault();
        panel.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === panel)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const onFocus = (event: FocusEvent) => {
      if (
        modalStack.at(-1) === entry &&
        event.target instanceof Node &&
        !panel.contains(event.target)
      )
        panel.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocus);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocus);
      const wasTop = modalStack.at(-1) === entry;
      const index = modalStack.indexOf(entry);
      if (index !== -1) modalStack.splice(index, 1);
      if (modalStack.length) updateBackground();
      else releaseBackground();
      if (wasTop && previous?.isConnected && !previous.closest("[inert]"))
        previous.focus({ preventScroll: true });
      else if (wasTop && modalStack.length) modalStack.at(-1)?.panel.focus({ preventScroll: true });
    };
  }, [active, portalRef, panelRef]);
}
