## 2024-10-12 - [Accessibility Tree Override via Fallback aria-labels]
**Learning:** Adding an automated fallback `aria-label` to reusable UI components (e.g., using a tooltip `title` as `aria-label`) causes the screen reader to prioritize the `aria-label` over the visible child text. This will override the button's accessible name and break Testing Library queries (e.g., `getByRole('button', { name: "Text" })`).
**Action:** When creating fallback accessibility logic for components like `Button`, always ensure it only applies to icon-only elements (e.g., conditionally verifying `!children` before assigning `aria-label`).

## 2026-10-21 - [Fallback aria-label refined: icon-only = no text children]
**Learning:** The original `!children` guard from the 2024-10-12 entry missed edge cases: a numeric child (`{0}`), fragments/arrays wrapping a single icon, or icon-only children embedded in a fragment were misclassified. A robust icon-only check inspects children TYPES instead of existence: promote `title` to `aria-label` only when every child of `React.Children.toArray(children)` is a non-string, non-number node.
**Action:** `Button.tsx:88` now implements the type-based check; explicit `aria-label` props still win (kiosk action buttons with visible labels are unaffected). Absorbed from agent draft PRs #66/#67/#69/#70/#71/#75 (all six identical) into commit `adb6178` via PR #80.

## 2026-10-21 - [Staging audit v8.31.2: unique headings and named icon-only controls]
**Learning:** The full 18-route headless audit (buttons sweep, axe, kiosk walk) surfaced issues axe misses when hidden/off-canvas: Logbook rendered a second `<h1>` for the active shift name (contributing to the known heading-order backlog); 7 icon-only buttons lacked accessible names (meter-readings close slide-over; 6 add/delete controls in GlobalVariablesManager) and the red delete buttons were hover-only visible (opacity-0 group-hover), unreachable by keyboard/touch.
**Action:** Shift name demoted to `<h2>` under the page h1; explicit aria-labels on all 7 controls; delete buttons gain group-focus-within/focus-visible reveal. Verified on rebuilt staging: logbook 1 h1, 0 unnamed buttons in meter/config, named deletes, suites 17/17.
## 2023-10-21 - ARIA Label Redundancy on Text Buttons
**Learning:** Adding `aria-label` to buttons that already have clear, visible text is an accessibility anti-pattern. It overwrites the visible text for screen readers, potentially causing confusion if the label differs or is redundant.
**Action:** Only apply `aria-label` to strictly icon-only interactive elements or when the visible text is insufficiently descriptive on its own.
