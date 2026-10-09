# Spec 027: Client Logo Config

- Estado: Borrador
- Autor: zer0x
- Fecha: 2026-10-09
- ADR relacionado: N/A (candidato si la decisión global-vs-por-cliente resulta permanente)

## Problema

El logo de marca está hardcodeado en el frontend y no es personalizable por cliente:

1. [LoginPage.tsx](file:///frontend/src/features/auth/pages/LoginPage.tsx) línea 14 importa estáticamente `Mini_Zer0x.jpg` y lo renderiza en líneas 97-105 con tamaño fijo (`h-20 sm:h-16 w-auto`, atributos `width="512" height="188"` anti-CLS). Cambiar de cliente/marca exige editar código y redeploy.
2. No existe ninguna clave de configuración de marca en el backend: el seed ([Phase1Service.ts](file:///backend/src/services/seeder/Phase1Service.ts)) solo siembra `max_weekly_hours`, `AUTH_SESSION_DURATIONS` y `accounting_lock_date`. El sistema genérico `GET/POST /api/configs/:key` ([routes.ts](file:///backend/src/modules/configs/http/routes.ts)) podría albergar la clave, pero hoy no hay validación de esquema para un objeto de branding ni endpoint de subida de imagen (el único precedente de archivo es `company-policy`, solo PDF).
3. El `LoginPage` es una ruta no autenticada, pero todos los hooks de config ([useConfigQuery.ts](file:///frontend/src/hooks/queries/useConfigQuery.ts)) están gated por `enabled: hasToken` (solo `getPublicCompanyPolicy` en [configService.ts](file:///frontend/src/services/configService.ts) lee sin token). Un logo configurable consumido en el login necesita lectura pública o fallback local garantizado.

Sin solución aquí.

## Alcance

Dentro:

- Fuente del logo sustituible por cliente: URL remota o archivo subido (PNG/JPG/SVG/WebP), persistida en backend vía `SystemConfig` y administrable desde la vista de Configuración ([Configuration.view.tsx](file:///frontend/src/features/configuration/views/Configuration.view.tsx) / [GlobalVariablesManager.tsx](file:///frontend/src/features/configuration/components/GlobalVariablesManager.tsx)).
- Tamaño personalizable desde la configuración (ancho/alto o escala), con rangos validados, aplicado en los puntos de marca que hoy usan el asset (`LoginPage`; header usa letra de `APP_TITLE`, ver decisión abierta).
- Fallback garantizado al asset empaquetado `Mini_Zer0x.jpg` cuando no hay configuración, la lectura falla o el usuario no está autenticado; preservando atributos `width`/`height` anti-CLS.
- Validación, autorización por rol y auditoría consistentes con el sistema de configs existente (`POST /api/configs/:key` solo `Administrador`, `CONFIG_SET` en audit log).

Fuera (explícito):

- Rebranding completo por cliente (colores, temas, `APP_TITLE`, CSS): solo logo + tamaño.
- El easter-egg de [AboutModal.view.tsx](file:///frontend/src/components/ui/AboutModal.view.tsx) (línea 4, mismo JPG con propósito lúdico) no se toca.
- La referencia documental `imagens/Mini_Zer0x.jpg` en [UserManualModal.tsx](file:///frontend/src/components/ui/UserManualModal.tsx) (contenido de ayuda embebido) no se toca.
- El logo textual `PORTAL ENTERPRISE` de los PDF en [exportToPdf.ts](file:///frontend/src/utils/export/exportToPdf.ts) no se toca en esta spec.
- Multi-tenant real (tabla de tenants, selector de cliente, dominios por cliente): ver decisión abierta en plan.md.

## Decisión T1 (cerrada 2026-10-09)

- **Modelo: Opción A** — clave global `branding_logo` por instancia (single-tenant; sin cambios de esquema).
- **Forma de la clave**: JSON `{ source: { kind: "upload" | "url", ref: string }, width: number, height: number }`.
- **Tamaño como ancho/alto explícitos en px** (no escala): el login necesita dimensiones intrínsecas conocidas antes de cargar para anti-CLS; una escala exigiría el tamaño base del asset remoto (desconocido hasta la carga → CLS). Rangos: 16–512 px por dimensión; por defecto `512x188` (asset empaquetado actual).
- **Subida de archivo incluida** (patrón `company-policy`): `POST /api/configs/brand-logo` multipart solo `Administrador`; SVG excluido en T1 (no se sirve JS embebido sin sanitizador) — PNG/JPG/WebP.

## Criterios de aceptación

- [ ] AC1: La fuente del logo es configurable por un Administrador (URL o archivo subido) y persiste en backend; un valor inválido (MIME no imagen, URL malformada) es rechazado con 400 y mensaje en español.
- [ ] AC2: El tamaño del logo es configurable (ancho/alto o escala con rangos validados, ej. 16–512 px o escala 0.5–3) y persiste en backend; fuera de rango es rechazado con 400.
- [ ] AC3: `LoginPage` renderiza el logo configurado con su tamaño sin estar autenticado; si no hay configuración o la carga falla, renderiza el asset empaquetado con los atributos `width`/`height` actuales y sin CLS regresivo ni pantalla rota.
- [ ] AC4: Existe una sección en la vista de Configuración (solo Administrador) para ver vista previa, editar fuente + tamaño y restablecer al valor por defecto, con toasts de éxito/error en español.
- [ ] AC5: Escritura restringida a rol `Administrador`, lectura del logo disponible sin autenticación (endpoint público al estilo `company-policy`), y cada cambio genera auditoría `CONFIG_SET` sin filtrar datos sensibles.
- [ ] AC6: La subida de archivo valida MIME/tamaño, evita path traversal (`basename`), limpia el archivo temporal ante fallo de validación y sirve el archivo con `Content-Type` correcto (precedente: `company-policy` en [companyPolicyStorage.ts](file:///backend/src/services/companyPolicyStorage.ts)).
- [ ] AC7: `swagger.json` y el SDK frontend (`api-schema.ts`) quedan sincronizados (`npm run check:sdk`), y `npm run validate:ci` de backend y frontend ejecuta en verde con 0 warnings.

## Restricciones

- Fastify es el único servidor HTTP; sin runtime Express nuevo.
- PgBouncer en `POOL_MODE: transaction`: cualquier escritura transaccional con variables de sesión debe usar `withDirectTransaction` con `DIRECT_URL` ([db.ts](file:///backend/src/services/db.ts)).
- Sin `any` en `src/`, sin `console.log` en producción (loggers estructurados), validación con `validateRequest`/`isRequestValidator` en rutas nuevas (manifiesto en [routeContracts.ts](file:///backend/src/platform/fastify/routeContracts.ts)).
- La configuración de logo no puede bloquear el login: lectura pública con timeout y fallback local; `staleTime` de React Query coherente con el resto de configs (5 min).
- Presupuesto de performance del login: el logo remoto debe usar `width`/`height` explícitos y `decoding="async"` como hoy; sin regresión de CLS.

## Trazabilidad

- Tests que lo probarán: suite de integración Fastify del módulo `configs` (contrato + validación + roles), tests de `configService`/hooks y de render del logo con fallback (Vitest/Testing Library).
- Docs a actualizar: ADR solo si la decisión global-vs-por-cliente es permanente; `backend/docs/swagger.json` y SDK se regeneran; `specs/027-client-logo-config/plan.md` registra la decisión tomada.
