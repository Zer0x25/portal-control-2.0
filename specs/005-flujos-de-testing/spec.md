# Spec 005: Flujos de testing (prácticas de industria)

- Estado: En ejecución (Fase 1)
- Autor: zer0x
- Fecha: 2026-10-03
- ADR relacionado: `docs/adr/0016-e2e-staging-local.md`

## Problema

La pirámide actual (spec 004) es sólida pero el flujo sigue atado a
estado compartido: integración backend contra la BD de dev, e2e contra
staging de larga vida con seed global, sin pruebas de carga, visuales
ni accesibilidad. El próximo bug gordo probablemente viva en una de
esas zonas ciegas (picos de fichaje, CSS roto, rate-limits por IP de
oficina) y hoy nada lo detectaría antes de producción.

## Alcance (TODO priorizada por valor/esfuerzo)

1. **Fase 1 — Carga pre-release (este spec, en curso)**: escenario
   realista de pico (login + sync de dashboard/portal) contra staging
   con Artillery (npm, sin imágenes nuevas). Preguntas a responder:
   ¿aguanta el pool PgBouncer=1?, ¿el limiter global 5000/15min por IP
   alcanza para una oficina tras NAT?, ¿p95 de lecturas bajo carga?
2. **Fase 2 — Accesibilidad**: axe-core sobre los flujos e2e
   existentes. Esfuerzo mínimo, hallazgos casi garantizados en el
   primer run (forms, contraste del tema industrial, foco en quiosco).
3. **Fase 3 — Regresión visual**: `toHaveScreenshot` en 3-4 páginas
   críticas (login, dashboard, worker-portal, governance). Paga desde
   el segundo run; exige congelar animaciones y enmascarar zonas
   dinámicas (clima aleatorio, timestamps).
4. **Fase 4 — Aislamiento de datos**: Testcontainers para integración
   backend (Postgres efímera por corrida, adiós dependencia de dev) y
   factorías por test en e2e (adiós seed global y `describe.serial`).
5. **Fase 5 — Supply chain**: Renovate con auto-merge de patch/minor
   con CI verde; majors siguen manuales (AGENTS.md §7).

## Fuera de alcance

- Gatear la suite e2e completa o la carga en CI (decisión de costo
  aparte; pre-release manual como el e2e full).
- Mutation testing (auditoría trimestral, no gate).
- Sintéticos post-deploy prod (cuando staging tenga paridad total).

## Criterios de aceptación

- [ ] AC1: escenario de carga corre contra staging y produce reporte
      (p95, error rate, top endpoints lentos) + hallazgos registrados.
- [ ] AC2: axe-core corre sobre al menos 3 flujos e2e con 0 violaciones
      críticas/sérias o backlog justificado.
- [ ] AC3: 3-4 screenshots baseline en el repo, verdes en 2 corridas.
- [ ] AC4: integración backend verde sin stack dev levantado.
- [ ] AC5: Renovate abierto, auto-merge de patch con CI verde.
