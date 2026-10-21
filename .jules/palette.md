## 2024-10-12 - [Accessibility Tree Override via Fallback aria-labels]
**Learning:** Adding an automated fallback `aria-label` to reusable UI components (e.g., using a tooltip `title` as `aria-label`) causes the screen reader to prioritize the `aria-label` over the visible child text. This will override the button's accessible name and break Testing Library queries (e.g., `getByRole('button', { name: "Text" })`).
**Action:** When creating fallback accessibility logic for components like `Button`, always ensure it only applies to icon-only elements (e.g., conditionally verifying `!children` before assigning `aria-label`).

## 2026-10-21 - [Fallback aria-label refined: icon-only = no text children]
**Learning:** The original `!children` guard from the 2024-10-12 entry missed edge cases: a numeric child (`{0}`), fragments/arrays wrapping a single icon, or icon-only children embedded in a fragment were misclassified. A robust icon-only check inspects children TYPES instead of existence: promote `title` to `aria-label` only when every child of `React.Children.toArray(children)` is a non-string, non-number node.
**Action:** `Button.tsx:88` now implements the type-based check; explicit `aria-label` props still win (kiosk action buttons with visible labels are unaffected). Absorbed from agent draft PRs #66/#67/#69/#70/#71/#75 (all six identical) into commit `adb6178` via PR #80.
