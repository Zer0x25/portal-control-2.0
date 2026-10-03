# Tareas 005: Flujos de testing

- [x] 1.1 Artillery instalado + `load:staging` + escenario v1 (lecturas).
- [x] 1.2 Corrida contra staging con reporte (p95, errores, top lentos).
      Baseline 2026-10-03 (300 VUs, 1910 req): p95 lecturas **10ms**,
      mediana 5ms — el pool PgBouncer=1 NO es cuello en lectura a este
      nivel; 1815×200 + 95×401 (ver F1).
- [x] 1.3 Hallazgos de carga registrados como follow-ups (o fixes). - F1 (sesiones worker ~108s): sin `AUTH_SESSION_DURATIONS` en BD
      rige el fallback `Usuario=0.03h`; `jwt.verify` + `expiresAt` lo
      hacen cumplir, así que el portal worker expira tokens a los ~2
      min (los 401 del run). ¿Endurecimiento intencional (spec 002) o
      fallback mal dimensionado para turnos de 8h? Decisión pendiente
      del usuario antes de tocarlo; el gate `maxErrorRate: 1` queda en
      rojo hasta entonces por diseño. - F2 (limiter global 5000/15min por IP ≈ 5.5 rps): dimensionar el
      spike v2 contra ese techo; una oficina tras NAT con sync
      agresivo puede rozarlo en pico real. Medir antes de subirlo.
- [ ] 2.1 axe-core + `e2e/a11y.spec.ts` (3 flujos, 0 critical/serious).
- [ ] 3.1 Baselines visuales de 3-4 páginas críticas, 2 corridas verdes.
- [ ] 4.1 Integración backend con Testcontainers (sin dev levantado).
- [ ] 4.2 Factorías e2e vía API + cleanup (adiós seed global).
- [ ] 5.1 Renovate + auto-merge patch con CI verde.
