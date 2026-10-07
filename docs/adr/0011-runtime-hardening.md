# ADR-0011: Endurecimiento del runtime HTTP y secretos (spec 002)

- Estado: Aceptado
- Fecha: 2026-10-02
- Autores: opencode
- Spec: `specs/002-runtime-hardening/`

Actualización 2026-10-07: Express está retirado. Las decisiones históricas de
contrato/seguridad se aplican ahora en Fastify; el manifiesto nativo y sus pruebas
reemplazan la introspección y middleware descritos abajo. OpenAPI se genera desde
`backend/src/platform/openapi/operations.ts`. Ver
[retiro de Express](../../specs/025-fastify-cutover/express-retirement.md).

## Contexto

Auditoría del 2026-10-02 con evidencia en código. Seis hallazgos:

- H-01: CORS `origin: true` + `credentials: true` con `ALLOWED_ORIGINS`
  sin leer en `backend/src`.
- H-02: `express.json({ limit: "50mb" })` global desde el commit inicial,
  sin justificación; import usa multipart (multer sin `limits`).
- H-03: `/api/admin` y `/api/maintenance` exentos del rate-limit global.
- H-04: `SEED_ADMIN_PASSWORD` con default `999.666` en producción.
- H-05: seed logueaba `passwordHash`.
- H-06: cadena de cambio forzado rota en dos puntos: login no exponía
  `isForcePasswordChange` y el modal nunca se abría (nada seteaba el
  flag); además `updateUser` con password no saldaba el flag.

## Decisión

1. CORS allowlist desde `ALLOWED_ORIGINS` (`src/utils/corsPolicy.ts`,
   testeable puro). `"*"` = abierto sin credenciales. `credentials: false`
   siempre: el frontend usa header `Authorization`, verificado sin
   `credentials: "include"` en `frontend/src/services`.
2. JSON 1mb global + pre-parser 10mb en 6 rutas bulk exactas
   (`BULK_JSON_PATHS` en `src/app.ts`; el segundo parser se salta body ya
   parseado). Multer import con `fileSize: 50mb, files: 1` (conserva el
   techo histórico) y `MulterError` mapeado a 413/400 en `errorHandler`.
3. Limiter propio 1000/15min en `/api/admin` (todo el router ya exige
   `authenticateToken + authorizeAdmin`; acota token robado).
   `/api/maintenance` conserva el skip: riesgo residual anotado.
4. Sin default de `SEED_ADMIN_PASSWORD` en `compose.yaml` (fail-fast de
   ADR-0004); seed loguea solo `username`/`role`.
5. Login y MFA-validate exponen `mustChangePassword`; `updateUser` salda
   el flag al fijar password salvo petición explícita; el frontend abre
   el modal desde `_handleSuccessfulLogin`.

## Alternativas consideradas

1. Global 1mb sin excepciones — descartada: los bulk (`records`,
   `shifts/assignments`) envían arrays no acotados y se romperían.
2. Global 5mb sin scope — descartada: mantiene superficie amplia sin
   justificación por ruta.

## Consecuencias

Positivas:

- Origen arbitrario con credenciales rechazado (test).
- Payloads absurdos rechazados con 413 antes de routing/auth.
- Defaults operativos eliminados; cadena de primer login funcional.

Negativas / costos aceptados:

- `ALLOWED_ORIGINS` debe incluir el frontend prod o queda fuera (rollback:
  revert + redeploy del tag anterior).
- Números de limiter (1000/15min) y bulk (10mb) son juicio documentado,
  a recalibrar con tráfico real.

## Referencias

- `backend/src/app.ts` — CORS, `BULK_JSON_PATHS`, `adminLimiter`.
- `backend/src/utils/corsPolicy.ts` — política pura.
- `backend/src/controllers/authController.ts` — flag en login/MFA.
- `backend/src/services/UserService.ts` — salda flag con password.
- `backend/tests/unit/runtime-hardening.test.ts` — 8 tests.
- `frontend/src/store/slices/authSlice.ts` — trigger del modal.
