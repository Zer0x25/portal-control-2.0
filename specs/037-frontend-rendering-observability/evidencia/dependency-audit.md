# Spec 037: dependency audit

`npm audit` on 2026-10-22, after `npm ci` from the committed lockfile:

- Full frontend dependency graph: 17 advisories (11 high, 4 moderate, 2 low; 0 critical).
- Production graph (`npm audit --omit=dev`): 0 advisories.
- The remaining findings are development-only. The LHCI tree accounts for
  findings in `@lhci/cli`, Lighthouse, and Puppeteer; the Vitest browser
  packages account for the rest. `puppeteer-core@25.16.0` is declared because
  LHCI resolves it when invoking the authenticated `puppeteerScript`. The
  audit still flags the development graph because the compatible LHCI and
  Lighthouse dependency ranges include affected releases; no forced override
  was applied.

The production audit is the release-relevant result. Re-run the full audit
when the LHCI/Vitest toolchain is upgraded.
