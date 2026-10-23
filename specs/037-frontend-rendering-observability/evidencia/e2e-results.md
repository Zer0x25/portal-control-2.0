# Spec 037: staging E2E evidence

Run on 2026-10-22 against the isolated production-style staging stack at
`127.0.0.1:18081` after rebuilding the frontend image:

- Playwright: 70/70 passed, including functional, visual, container-query, and
  performance projects.
- Container-query test: passed with a wide viewport and a narrow block,
  confirming the layout follows the container width.
- Critical route readiness (all below the 30-second cap):

| Route         | Ready time |
| ------------- | ---------: |
| Dashboard     |     904 ms |
| Planner       |   1,325 ms |
| Worker portal |     844 ms |
| Logbook       |     892 ms |
| Kiosk         |     677 ms |

- Governance tab switch: 571.20 ms (below the 15-second cap).
- Virtualized audit scroll: 183.42 ms during the full suite; an isolated
  repeat measured 66.92 ms. Both pass the existing 500 ms assertion. The
  performance test prints a warning above 50 ms, so the scroll measurement is
  recorded for follow-up rather than treated as a passing frame budget.
- The governance light/dark visual baselines were regenerated after the
  container query compacted cards below their own width threshold. The
  changing integrity status and loading badges are now masked as live data;
  the remaining routes' snapshots stayed unchanged.

The render-count comparison is in `render-after.json` and shows no route above
its pre-compiler baseline.
