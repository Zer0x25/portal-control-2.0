# Spec 037: Lighthouse CI evidence

Collected on 2026-10-22 with LHCI against the rebuilt isolated staging gateway
at `127.0.0.1:18081`, using the final lockfile (`puppeteer-core@25.16.0`).
One run per route; all six report sets passed the configured assertions:
performance score ≥ 0.50, LCP ≤ 4,000 ms, CLS ≤ 0.25, FCP ≤ 3,000 ms, and
server response time ≤ 1,800 ms.

| Route            | Performance |      LCP |    FCP | CLS | Server response |
| ---------------- | ----------: | -------: | -----: | --: | --------------: |
| Dashboard        |        0.90 |   790 ms | 309 ms |   0 |            2 ms |
| Planner          |        0.96 | 1,090 ms | 192 ms |   0 |            1 ms |
| Worker portal    |        0.88 | 1,367 ms | 183 ms |   0 |            1 ms |
| Logbook          |        0.95 | 1,245 ms | 210 ms |   0 |            2 ms |
| Kiosk            |        0.99 |   769 ms | 172 ms |   0 |            2 ms |
| Governance audit |        0.98 | 1,294 ms | 544 ms |   0 |            3 ms |

The LHCI assertions pass for every route. This is a synthetic local staging
run, not field data or a production measurement. Lighthouse navigation mode
does not supply a representative INP audit; `web-vitals` records INP in the
field with route, role, device, and connection context.
