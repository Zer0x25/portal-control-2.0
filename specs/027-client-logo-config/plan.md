# Plan 027: Client Logo Config

Spec: [spec.md](file:///specs/027-client-logo-config/spec.md). Constitución: [constitution.md](file:///specs/constitution.md).

## Estrategia

1. **Decidir el modelo de configuración (decisión abierta, ver abajo)**: una sola clave JSON `branding_logo` (`{ source, width, height }` o `{ source, scale }`) frente a claves separadas (`brand_logo_url`, `brand_logo_width`, `brand_logo_height`). Recomendación: una sola clave JSON con esquema Zod, para validar coherencia fuente+tamaño en un solo `CONFIG_SET` atómico.
2. **Reutilizar el patrón `company-policy` para el archivo**: si se acepta subida de archivo, nuevo endpoint `POST /api/configs/brand-logo` (multipart, solo `Administrador`, validación de imagen PNG/JPG/SVG/WebP con límite de tamaño) con almacenamiento en `uploads/brand-logo/` y metadatos en `SystemConfig`; lectura pública `GET /api/configs/public/brand-logo(+/file)` sin autenticación, igual que el reglamento. Alternativa sin backend de archivos: solo URL remota validada en la clave JSON (menor superficie, sin almacenamiento).
3. **Exponer lectura pública y mantener escritura restringida**: el `LoginPage` no tiene token, por lo que el logo necesita endpoint público (precedente: `GET /api/configs/public/company-policy` en [routes.ts](file:///backend/src/modules/configs/http/routes.ts)); la escritura sigue por `POST /api/configs/:key` o el endpoint dedicado, ambos con guard `elevated` (`Administrador`) y auditoría `CONFIG_SET` existente en [ConfigService.ts](file:///backend/src/services/ConfigService.ts).
4. **Desacoplar el frontend del asset estático**: nuevo hook público (sin gate de token, con `staleTime` de 5 min y fallback al import estático) más un componente `BrandLogo` que aplica tamaño configurado y conserva `width`/`height` + `decoding="async"`; `LoginPage` lo consume en lugar del `<img>` actual. Evaluar si el header/sidebar adoptan `BrandLogo` o quedan fuera (usan letra de `APP_TITLE`, no imagen).
5. **Administración y verificación**: nueva sección en [GlobalVariablesManager.tsx](file:///frontend/src/features/configuration/components/GlobalVariablesManager.tsx) (vista previa, edición, restablecer) usando [useConfigMutations.ts](file:///frontend/src/hooks/useConfigMutations.ts); regenerar `swagger.json` + SDK (`npm run check:sdk`); suites de integración y de render con fallback; cierre con `validate:ci` en ambos paquetes.

## Decisión abierta: setting global vs por-cliente

Hallazgo verificado: `SystemConfig` ([schema.prisma](file:///backend/prisma/schema.prisma), modelo `SystemConfig` con `key` como `@id`) es una tabla global clave-valor **sin columna de tenant/cliente**, y no existe ningún modelo `Tenant`/`Client` ni `clientId` en `backend/src` (búsqueda sin resultados). El despliegue es single-tenant por instancia.

- **Opción A (recomendada, sin migración)**: clave global `branding_logo`. Cada despliegue/cliente tiene su instancia y su logo. Cero cambios de esquema; coherente con `company_policy_meta` ("PDF DINÁMICO POR CLIENTE" ya es global por instancia).
- **Opción B (nombrespaced)**: claves prefijadas (`branding_logo:<clientId>`) sin cambio de esquema, pero exige definir de dónde sale `clientId` (dominio, variable de entorno, cabecera) y hoy no hay tal concepto.
- **Opción C (multi-tenant real)**: nueva tabla/columna + migración Prisma + `DIRECT_URL` + contratos. Fuera del alcance de esta spec salvo que el producto lo exija; requeriría ADR propio.

La spec asume **Opción A** salvo que durante T1 se demuestre un requisito multi-tenant; el plan debe registrar la opción elegida antes de implementar.

## Archivos a tocar

| Archivo | Cambio |
| ------- | ------ |
| `backend/src/modules/configs/application/contracts.ts` (o nuevo `brandLogo.ts`) | Esquema Zod de `branding_logo` (source + width/height o scale, rangos) |
| `backend/src/modules/configs/application/flows.ts` | Flujos `brandLogo()` / subida con validación, reutilizando `createConfigFlows` |
| `backend/src/modules/configs/http/routes.ts` | Endpoints `GET /api/configs/public/brand-logo(+/file)` y `POST /api/configs/brand-logo` (o solo validación en `/:key` si es URL) |
| `backend/src/platform/fastify/routeContracts.ts` | Alta de las rutas en el manifiesto de `configs` |
| `backend/src/platform/openapi/operations.ts` + `backend/docs/swagger.json` | Documentación OpenAPI de los nuevos endpoints |
| `backend/src/services/companyPolicyStorage.ts` (o nuevo `brandLogoStorage.ts`) | Almacenamiento de imagen con `basename`, límites y limpieza ante fallo |
| `backend/src/services/seeder/Phase1Service.ts` | Seed del valor por defecto de `branding_logo` (solo si falta, sin sobrescribir) |
| `frontend/src/services/configService.ts` | Métodos `getPublicBrandLogo()` / `uploadBrandLogo()` (lectura sin token) |
| `frontend/src/hooks/queries/useConfigQuery.ts` | Hook público `useBrandLogoQuery` (sin gate de token, fallback local) |
| `frontend/src/components/ui/BrandLogo.tsx` (nuevo) | Componente de logo con tamaño configurable + anti-CLS |
| `frontend/src/features/auth/pages/LoginPage.tsx` | Consumir `BrandLogo` en lugar del `<img>` hardcodeado |
| `frontend/src/features/configuration/components/GlobalVariablesManager.tsx` | Sección de marca: vista previa, edición, restablecer |
| `frontend/src/types/api-schema.ts` | Regenerado vía SDK (`npm run check:sdk`) |
| `frontend/src/hooks/useConfigMutations.ts` | Invalidación de la query de logo tras `set` (si aplica) |

## Contratos afectados

- Rutas Fastify: `GET /api/configs/public/brand-logo`, `GET /api/configs/public/brand-logo/file`, `POST /api/configs/brand-logo` (nombres propuestos; si se opta por solo-URL, basta `GET /api/configs/:key` + validación en `set`). Manifiesto obligatorio en `routeContracts.ts`.
- Esquema Prisma: sin cambios en Opción A/B; migración solo en Opción C (fuera de alcance).
- `swagger.json` + SDK frontend (`api-schema.ts`): regeneración y verificación con `npm run check:sdk`.
- Clave `SystemConfig.branding_logo`: forma JSON acordada en T1 (documentar ejemplo en el ADR o en el spec si no hay ADR).

## Riesgos y rollback

- **Riesgo**: el login depende de un asset remoto (latencia/caída, CLS, mixed-content). **Mitigación**: endpoint público liviano con metadatos (dimensiones) + fallback inmediato al JPG empaquetado; `width`/`height` siempre presentes; timeout de fetch corto.
- **Riesgo**: subida maliciosa (SVG con JS, polyglot, path traversal, DoS por tamaño). **Mitigación**: allowlist de MIME, límite de tamaño (multipart 15 MB como `company-policy` o menor, ej. 2–5 MB para logo), `path.basename`, validación de cabecera de imagen, servir con `Content-Type` estricto y `Content-Disposition: inline`; SVG solo si se sanitiza o se excluye (decidir en T1).
- **Riesgo**: `GET /api/configs/:key` requiere auth y rompería el login anónimo. **Mitigación**: lectura por endpoint público dedicado, nunca por el genérico autenticado.
- **Rollback**: `git revert` de los commits de la rama `feat/client-logo-config`; la clave `branding_logo` es aditiva (no rompe lecturas existentes) y el frontend con fallback ignora su ausencia. Si se subieron archivos, `uploads/brand-logo/` es contenido desechable fuera del repo.

## Verificación

```bash
cd backend && npm run check
cd backend && npm run check:sdk
cd backend && npm run validate:ci
cd frontend && npm run check
cd frontend && npm run validate:ci
npm run spec:check
npm run docs:check
npm run lint:budget
```
