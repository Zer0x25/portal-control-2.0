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
export const ROW_BASE_CLASS =
  "border-b border-gray-100 dark:border-gray-800 transition-colors duration-150";

/** Hover background for active (non-archived) rows */
export const ROW_HOVER_CLASS = "hover:bg-white/60 dark:hover:bg-gray-700/60";

/** Opacity + grayscale for archived/past rows */
export const ROW_ARCHIVED_CLASS = "opacity-40 grayscale-[0.5]";

// ── Text classes ──────────────────────────────────────────────────────────────
/** Main cell text — employee name, pattern name, etc. */
export const TEXT_PRIMARY = "text-sm font-semibold text-gray-900 dark:text-gray-100";

/** Secondary cell text — dates, labels, etc. */
export const TEXT_SECONDARY = "text-sm text-gray-600 dark:text-gray-300";

/** Muted/empty state text — "Indefinido", notes placeholder, etc. */
export const TEXT_MUTED = "text-sm text-gray-400 dark:text-gray-500 italic";

/** Monospaced cell text — hours, numeric values */
export const TEXT_MONO = "text-sm font-mono text-gray-600 dark:text-gray-300";
