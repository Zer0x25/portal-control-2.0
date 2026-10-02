# Guia Definitiva de Refactor Frontend

## Objetivo

Unificar el criterio de arquitectura del frontend y evitar duplicidad documental.
Este documento es la fuente unica de verdad para nuevas migraciones y mantenimiento.

## Estado consolidado (Marzo 2026)

- Migracion por `features/*` implementada.
- Patron `container/view` aplicado en features y shell global.
- `hooks/layout` reservado para logica de shell global.
- Controllers de dominio movidos a `features/<feature>/hooks`.

## Regla principal de ubicacion

1. `src/features/<feature>/...`

- Todo lo que sea logica de dominio de esa feature.
- Incluye hooks de orquestacion y controllers de modales de negocio.

2. `src/components/layout/...`

- Solo shell global de aplicacion (header/sidebar/layout/notificaciones globales).
- Puede usar `container/view`.

3. `src/hooks/layout/...`

- Solo controllers y utilidades del shell global.
- Prohibido agregar logica de dominio aqui.

4. `src/components/ui/...`

- Componentes UI compartidos y presentacionales.
- Si un modal UI necesita logica de dominio: usar `container` en `components/ui` y controller en `features/<feature>/hooks`.

## Estructura estandar por feature

```txt
src/features/<feature>/
  containers/
  views/
  hooks/
  components/
  pages/        # opcional, solo cuando agrega logica real de routing/entry
  index.ts
```

## Patron obligatorio

1. `*.container.tsx`

- Orquesta hooks, estado y side-effects.
- No contiene UI compleja.

2. `*.view.tsx`

- Presentacion pura por props.
- Sin llamadas a servicios/store global/auth/router (excepto casos muy justificados y documentados).

3. `use*Controller` o `use*Data`

- Encapsula reglas de negocio, validaciones, efectos y wiring de acciones.

## Mapeo vigente de shell global

- Layout controllers validos en `src/hooks/layout`:
  - `useSidebarController`
  - `usePersistentLayoutController`
  - `useHeaderController`
  - `useNotificationCenterController`
  - `useAboutModalController`
  - `sidebarMenu.ts`

## Mapeo vigente de controllers de dominio (ya migrados)

- `ChangePasswordModal` -> `src/features/auth/hooks/useChangePasswordModalController.ts`
- `QuickActionModal` -> `src/features/time-control/hooks/useQuickActionModalController.ts`
- `CorrectionRequestModal` -> `src/features/worker-portal/hooks/useCorrectionRequestModalController.ts`
- `QuickNotesModal` -> `src/features/dashboard/hooks/useQuickNotesModalController.ts`
- `EditTimestampModal` -> `src/features/time-control/hooks/useEditTimestampModalController.ts`
- `ForceChangePasswordModal` -> `src/features/auth/hooks/useForceChangePasswordModalController.ts`

## Avance validado de esta iteracion

- `Dashboard` ahora conecta `QuickActionModal` con acciones reales de inicio/fin de colacion.
- Se agrego cobertura de tests para controladores de modales refactorizados:
  - `useEditTimestampModalController`
  - `useQuickActionModalController`
  - `useForceChangePasswordModalController`
  - `useCorrectionRequestModalController`
  - `useQuickNotesModalController`
- `Supervisor Dashboard` refactorizado en tabs criticos:
  - `ReportsTab` -> `useReportsTabController`
  - `AccountingClosureTab` -> `useAccountingClosureTabController`
  - `AnalyticsTab` -> `useAnalyticsTabController`
- `Time Control` refactorizado en capa de tabla:
  - `TimeRecordTable` -> `useTimeRecordTableController`
  - virtualizacion/infinite scroll compartido -> `useInfiniteVirtualizedList`
  - `TimeRecordRow` -> `useTimeRecordRowController`
- Contratos KPI/Reportes tipados:
  - nuevo contrato API en `src/types/kpi-api.ts`
  - `kpiService` sin `any` en `overview`, `detailed-report`, `daily-planning`, `summary`
  - tests de contrato agregados en `src/tests/services/kpiService.contract.test.ts`

## Deuda tecnica activa

- Mantener `pages/` solo para casos con logica real (entrada/routing) y evitar wrappers pasivos.
- Reducir warnings legacy (`unused` / `no-explicit-any`) en features ya migradas.
- Mantener cobertura de tests por cada nuevo controller/hook extraido en siguientes iteraciones.

## Checklist de calidad por PR

- `npm --prefix Frontend run check`
- `npm --prefix Frontend run lint`
- `npm --prefix Frontend run test:run`
- Revisar que no se introduzca logica de dominio en `hooks/layout`.
- Revisar que `view` reciba props tipadas y no mezcle side-effects.

## Definition of Done (DoD) para separacion Logica/UI

Un modulo se considera refactorizado cuando cumple TODO:

1. Tiene `hook/controller` para logica y `view` para UI.
2. `components/*` legacy (si existen) solo re-exportan container.
3. `*.view.tsx` no importa `services`, `store`, ni `react-router-dom`.
4. `*.view.tsx` no usa `fetch`, `localStorage`, `sessionStorage`, `window.location`.
5. Pasa `npm --prefix Frontend run build` sin errores.
6. Lint sin violaciones de reglas de arquitectura en `*.view.tsx`.

## Checklist operativo rapido (pre-commit)

1. `npm --prefix Frontend run lint`
2. `npm --prefix Frontend run build`
3. `rg -n "fetch\\(|localStorage|sessionStorage|window\\.location|useStore\\(" Frontend/src/features/**/views`
4. `rg -n "services/|store/|react-router-dom" Frontend/src/features/**/views`

## Anti-patrones

- Agregar controllers de feature en `src/hooks/layout`.
- Poner reglas de permisos/rutas/queries dentro de `*.view.tsx`.
- Hacer modales de dominio 100% dentro de `components/ui` sin controller externo.

## Estrategia para nuevo refactor

1. Identificar ownership del dominio.
2. Crear controller en `features/<feature>/hooks`.
3. Crear `container/view` en el punto de entrada actual.
4. Mantener archivo legacy como re-export para no romper imports.
5. Validar y recien despues simplificar rutas/imports legacy.

## Documentos deprecados

- `Frontend/docs/UI-REFRACTOR.md` -> removido
- `Frontend/docs/UI-REFACTOR-PHASE2.md` -> removido

---

Ultima actualizacion: 2026-03-05
