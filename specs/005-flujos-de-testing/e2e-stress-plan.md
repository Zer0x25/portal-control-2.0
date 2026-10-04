# Plan de pruebas e2e + stress contra staging (2026-10-04)

Objetivo: exercitar el sistema real (build prod en staging) antes de
release y cazar bugs por capas: rutas, flujos de negocio, concurrencia,
stress. Por fases; cada fase se cierra arreglando lo que falle,
rebuildeando staging y volviendo a correr hasta verde antes de la
siguiente.

## Fase 1 — Barrido de rutas (hoy)

- Spec `e2e/routes-sweep.spec.ts`: para cada rol (admin, worker) y cada
  ruta del menú, navegar con `loginFast` + hash route, verificar que no
  haya redirect a login, ni crash (ErrorBoundary), ni pageerror.
- Rutas admin: dashboard, time-control, logbook, meter-readings,
  configuration, user-management, employee-management,
  personnel-management, theoretical-shifts, shift-calendar,
  communications, email-center, audit-logs, master-data-data-export,
  planning/monthly, admin/governance.
- Rutas worker: worker-portal, shift-calendar, communications (si aplica).
- Criterio: 0 pageerrors, 0 "algo salió mal" (ErrorBoundary), 0 redirect
  inesperado al login (salvo rutas realmente restringidas).

## Fase 2 — Flujos de negocio navegando UI

- Admin: crear empleado → asignar turno → generar reporte mensual →
  exportar registros → cerrar período (lock date).
- Worker: fichar entrada/salida (ya cubierto), ver calendario, solicitar
  ausencia (cubierto), ver registros mensuales, descargar PDF.
- Criterio: el resultado visible en UI coincide con la API.

## Fase 3 — Concurrencia (varios browsers en paralelo)

- N VUs (5-10) fichando/leyedo en paralelo contra staging con
  sesiones de worker distintas (resetear registros de cada uno vía API).
- Login concurrente (burst) — ya cubierto en backend; aquí se valida
  que la UI sigue fluida.
- Criterio: 0 5xx, 0 tokens colisionados, UI responde.

## Fase 4 — Stress ligero de backend vía API (Artillery)

- Escenario de escritura: ciclo fichaje con usuarios dedicados +
  cleanup; validar pgbouncer connection_limit=1 no derrumba.
- Errores 4xx/5xx > 1% = frena y arregla.

## Fase 5 — Regresión de bugs encontrados (fix + rebuild staging)

- Cada hallazgo de F1-F4 se arregla, se commitea, se rebuildea la
  imagen staging afectada y se vuelve a correr la fase.

## Criterio global

- Ninguna fase empieza hasta que la anterior esté verde.
- Cada fase termina en commit (spec + test + fix si aplica) con
  `validate:ci` verde y push.
