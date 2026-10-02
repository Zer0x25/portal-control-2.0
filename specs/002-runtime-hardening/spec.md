# Spec 002: Endurecimiento del runtime HTTP y secretos

- Estado: Implementado
- Autor: opencode
- Fecha: 2026-10-02
- ADR relacionado: pendiente (requerido al aprobar)

## Problema

Auditoría del 2026-10-02 sobre `backend/src/app.ts` y seed encontró 6
hallazgos con evidencia. Ninguno tiene spec ni decisión registrada:

- H-01: CORS `origin: true` + `credentials: true` (`app.ts:53-61`)
  mientras `ALLOWED_ORIGINS` existe en `compose.yaml:63` pero ningún
  archivo de `backend/src` la lee. Cualquier origen con credenciales.
- H-02: `express.json({ limit: "50mb" })` global (`app.ts:63-64`).
  Solo `/api/import` necesita cuerpo grande.
- H-03: el rate-limit global exime `/api/admin` y `/api/maintenance`
  (`app.ts:78`) y el maintenance gate exime `/api/admin`
  (`maintenanceMiddleware.ts:5`). Superficie admin sin throttle.
- H-04: `SEED_ADMIN_PASSWORD` con default `999.666` en
  `compose.yaml:66`. Con DB fresca en prod crearía `admin/999.666`,
  contradiciendo el fail-fast de ADR-0004.
- H-05: el seed loguea el objeto admin con `passwordHash`
  (`backend/prisma/seed.ts:38,78`). Hashes en logs de contenedor.
- H-06: el frontend crea usuarios con password fija `"changeme123"`
  (`frontend/src/store/slices/userSlice.ts:155-159`). Falta verificar
  si el backend fuerza cambio al primer login.

## Alcance

Dentro:

- Los 6 hallazgos con fix + test que lo demuestre.

Fuera (explícito):

- Cambio de modelo de auth (fuera de este spec).
- Rotación de secretos ya expuestos (proceso manual aparte).

## Criterios de aceptación

- [ ] AC1: CORS solo acepta orígenes de `ALLOWED_ORIGINS`; origen
      arbitrario con credenciales es rechazado (test).
- [ ] AC2: límite global ≤ 1mb y `/api/import` conserva límite amplio (test).
- [ ] AC3: `/api/admin` tiene throttle propio o justificación en ADR.
- [ ] AC4: sin `SEED_ADMIN_PASSWORD` en prod el seed falla explícito,
      nunca crea `admin/999.666` (test o arranque verificado).
- [ ] AC5: ningún log emite `passwordHash`.
- [ ] AC6: auditoría del flujo de primer login documentada; si no fuerza
      cambio, el fix lo incluye.

## Restricciones

Constitución I–V. Cambios de comportamiento: rollout con ADR y nota de
rollback por hallazgo.

## Trazabilidad

- Tests: guard de contrato + tests de integración auth/límites.
- Docs a actualizar: ADR nuevo, `README.md` §2 si cambian variables.
