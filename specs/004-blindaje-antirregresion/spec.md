# Spec 004: Blindaje antiregresión (cobertura + e2e)

- Estado: En ejecución
- Autor: zer0x
- Fecha: 2026-10-03
- ADR relacionado: pendiente (requerido al aprobar)

## Problema

Cobertura unitaria ~17% en ambos paquetes (backend 17.6% líneas,
frontend 17.5%). La red real es la suite de integración (184 tests vs
Postgres real) + smoke e2e, pero la suite e2e completa está podrida
(selectores de una UI anterior, timeouts de 10-15s bajo un boot de ~14s+)
y nunca corrió en CI (solo `smoke.spec.ts` está gateado).

## Alcance

1. **Fase 1 — Staging local + e2e headless baseline**: levantar
   `compose.staging.yaml`, correr smoke y registrar el estado real de
   cada spec e2e contra staging (línea base, sin arreglar nada).
2. **Fase 2 — Subir cobertura unitaria en servicios críticos**:
   backend `services/` con lógica de negocio sin tests unitarios
   (frontera: reglas de turnos, integridad, auditoría) y frontend
   `hooks/` + `utils/` puros. Ratchet solo sube.
3. **Fase 3 — Reescribir e2e podrida**: selectores contra la UI actual,
   timeouts de boot a 60s (criterio del smoke), hasta suite completa
   verde en local. Decidir después si se gatea en CI (cuesta minutos).

## Fuera de alcance

- Subir el runtime Node 24 (LTS hasta 2028) ni `@types/node` (ya en 26).
- Majors retenidos (typescript 7, prisma 8, babel 8): ver AGENTS.md §7.
- Gatear la e2e completa en CI: decisión de costo aparte.

## Criterios de aceptación

- [x] AC1: staging levanta con `compose.staging.yaml` y el smoke pasa headless.
- [x] AC2: informe de baseline e2e (qué specs pasan/fallan y por qué).
- [x] AC3: thresholds de cobertura suben al menos una vez por paquete.
- [ ] AC4: suite e2e completa verde en local (staging o dev).
