# Tareas 027: Client Logo Config

Spec: [spec.md](file:///specs/027-client-logo-config/spec.md). Plan: [plan.md](file:///specs/027-client-logo-config/plan.md).

Reglas: una tarea = un commit o PR revisable. Cada tarea cita su AC. Convencional Commits sin emojis. Ninguna tarea toca código fuera de lo listado en el plan.

- [x] T1: `docs(specs): registrar decisión de modelo branding global vs por-cliente y forma de la clave` — cerrar la decisión abierta del plan (Opción A/B/C), fijar nombre de clave (`branding_logo` JSON) y si el tamaño es ancho/alto o escala (AC1, AC2)
- [x] T2: `feat(configs): agregar esquema y validación de branding_logo con rangos de tamaño` — Zod en el módulo `configs` + validación en `set` con 400 en español ante MIME/URL/dimensiones inválidas (AC1, AC2)
- [x] T3: `feat(configs): exponer lectura pública y subida de logo con guards de rol` — endpoints público/autenticado en `routes.ts` + manifiesto en `routeContracts.ts` + almacenamiento con `basename` y limpieza ante fallo (AC5, AC6)
- [ ] T4: `feat(configs): documentar endpoints en OpenAPI y sincronizar SDK frontend` — `operations.ts`, `swagger.json` y `api-schema.ts` regenerados, `npm run check:sdk` en verde (AC7)
- [ ] T5: `feat(frontend): agregar hook público y componente BrandLogo con fallback anti-CLS` — `useBrandLogoQuery` sin gate de token + `BrandLogo.tsx` con `width`/`height` y fallback a `Mini_Zer0x.jpg` (AC3)
- [ ] T6: `feat(frontend): consumir BrandLogo en LoginPage sin regresión visual` — reemplazo del `<img>` hardcodeado en `LoginPage.tsx` preservando estilos y animaciones (AC3)
- [ ] T7: `feat(frontend): agregar sección de marca en Configuración con vista previa y restablecer` — edición de fuente + tamaño solo Administrador con toasts en español (AC4)
- [ ] T8: `test(logo-config): cubrir contrato, roles, validación y render con fallback` — integración Fastify (manifiesto, 400, 403, público sin token) + Vitest del hook/componente y subida inválida (AC1, AC2, AC3, AC5, AC6)
- [ ] T9: `chore(logo-config): correr validate:ci backend + frontend y spec/docs/lint checks` — `npm run check`, `validate:ci` (ambos), `spec:check`, `docs:check`, `lint:budget` en verde (AC7)
- [ ] T10: `docs(logo-config): registrar ADR solo si la decisión de modelo es permanente` — ADR numerado e indexado en `docs/adr/README.md` únicamente si el modelo elegido es estructural permanente (AC7)
