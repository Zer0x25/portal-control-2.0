/**
 * Design tokens shared across all desktop list components.
 * Single source of truth for row heights, colors, and state classes.
 *
 * Usage:
 *   import { LIST_ROW_HEIGHT, ROW_BASE_CLASS, ... } from "./listTokens";
 */

// ── Row height ────────────────────────────────────────────────────────────────
/** Standard estimated row height for @tanstack/react-virtual */
export const LIST_ROW_HEIGHT = 65;

/** Standard mobile list container style */
export const LIST_MOBILE_HEIGHT_STYLE = {
  height: "calc(100vh - 300px)",
  minHeight: "450px",
  contain: "strict" as const,
};

// ── Row state classes ─────────────────────────────────────────────────────────
/** Bottom border applied to every row */
export const ROW_BASE_CLASS = "border-b border-token-border-subtle transition-colors duration-150";

/** Hover background for active (non-archived) rows */
export const ROW_HOVER_CLASS = "hover:bg-token-surface-hover";

/** Opacity + grayscale for archived/past rows */
export const ROW_ARCHIVED_CLASS = "opacity-40 grayscale-[0.5]";

// ── Text classes ──────────────────────────────────────────────────────────────
/** Main cell text — employee name, pattern name, etc. */
export const TEXT_PRIMARY = "text-sm font-semibold text-token-text-primary";

/** Secondary cell text — dates, labels, etc. */
export const TEXT_SECONDARY = "text-sm text-token-text-secondary";

/** Muted/empty state text — "Indefinido", notes placeholder, etc. */
export const TEXT_MUTED = "text-sm text-token-text-tertiary italic";

/** Monospaced cell text — hours, numeric values */
export const TEXT_MONO = "text-sm font-mono text-token-text-secondary";
