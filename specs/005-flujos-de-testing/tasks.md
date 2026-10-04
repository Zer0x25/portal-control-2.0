# Tareas 005: Flujos de testing

- [x] 1.1 Artillery instalado + `load:staging` + escenario v1 (lecturas).
- [x] 1.2 Corrida contra staging con reporte (p95, errores, top lentos).
      Baseline 2026-10-03 (300 VUs, 1910 req): p95 lecturas **10ms**,
      mediana 5ms — el pool PgBouncer=1 NO es cuello en lectura a este
      nivel; 1815×200 + 95×401 (ver F1).
- [x] 1.3 Hallazgos de carga registrados como follow-ups (o fixes). - F1 (sesiones worker ~108s): CERRADO sin cambios — diseño del
      producto (quiosco marca + consulta, tokens cortos por seguridad). - F2 (limiter global 5000/15min por IP): CERRADO sin cambios.
      Caso de uso real (oficinas tras NAT, usuarios marcando y
      consultando lo suyo) queda lejos del techo; subirlo sin medición
      real sería exponerse. Si crece, la palanca correcta es
      PgBouncer (hoy `connection_limit=1`), no el limiter.
- [x] 2.1 axe-core + `e2e/a11y.spec.ts` (3 flujos, 0 critical/serious).
      3 flujos (login, dashboard, worker-portal) en 9s. Hallazgos:
      crítico `select-name` en WorkerPortal (corregido con aria-label),
      `scrollable-region-focusable` (corregido con tabIndex=0 en el
      contenedor de registros; queda 1 nodo similar en el calendario,
      en backlog), contraste AA insuficiente: 30+ nodos serios del tema
      oscuro (`--text-tertiary #64748b`, botón "Salir" rojo) — backlog
      justificado: exige decisión de diseño sobre la paleta Industrial.
      Gate actual: 0 críticas; serías/moderadas se reportan en backlog.
- [x] 1.4 Fase 4 stress escrituras (Artillery, 60 req): antes del fix
      30×500 por ALREADY_PUNCHED_OUT/WORKDAY_FINISHED sin mapear en
      timeRecordController (f579852). Tras fix: 60×400 esperados
      (una sola jornada activa por empleado/día; 1 solo EMP001) y 0×500.
- [ ] 3.1 Baselines visuales de 3-4 páginas críticas, 2 corridas verdes.
- [ ] 4.1 Integración backend con Testcontainers (sin dev levantado).
- [ ] 4.2 Factorías e2e vía API + cleanup (adiós seed global).
- [ ] 5.1 Renovate + auto-merge patch con CI verde.
