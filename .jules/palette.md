## 2026-10-13 - Fix aria-label issue with text-content buttons
**Learning:** Applying an `aria-label` fallback (e.g. using the `title` attribute) to a button with text children overrides its accessible name in the accessibility tree and breaks UI tests (e.g., Testing Library's `getByRole('button', { name: ... })`).
**Action:** When adding automated `aria-label` fallbacks to reusable components (like Button), check if the component has text content (`children`) and only apply the fallback to icon-only buttons (when `children` is falsy).
