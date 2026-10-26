# Spec 044: Mostrar antes la bienvenida del Dashboard

- Estado: Completado
- Autor: zer0x
- Fecha: 2026-10-23
- ADR relacionado: N/A

## Problema

El perfil frío de staging identificó el texto del reloj en `WelcomePanel` como candidato LCP, con 5.416 ms de LCP y 4.966 ms de render delay medianos. `Dashboard.view.tsx` retorna una pantalla de sincronización completa mientras cargan `useDashboardOverviewQuery` y `useReportsQuery`, aunque la bienvenida no consume esos datos. El marcador visible de `server-clock` apareció en mediana de 675 ms en Playwright; Lighthouse y Playwright tienen condiciones distintas, así que el cambio debe medirse con ambos sin atribuir causalidad por una sola tanda.

## Alcance

Dentro:

- Renderizar `WelcomePanel` durante la carga inicial del overview y de reportes.
- Mantener el indicador “Sincronizando Dashboard” para el área de widgets hasta que las consultas que la alimentan terminen.
- Mantener intactos la grilla final, el contenido de widgets, las consultas, la semántica de datos y las solicitudes de red.
- Repetir tres capturas autenticadas de readiness y tres corridas Lighthouse frías de Dashboard, registrando commit, imagen y métricas.

Fuera (explícito):

- Cambiar endpoints, consultas, contratos, permisos, datos semillados o cache/freshness.
- Alterar el diseño final de la bienvenida o de la grilla de widgets.
- Afirmar mejoras de LCP/CWV si los rangos de Lighthouse se solapan o no hay una comparación controlada.

## Criterios de aceptación

- [x] AC1: Mientras `isLoadingOverview` sea verdadero o falten reportes iniciales, se muestra `WelcomePanel` y se mantiene el spinner de sincronización; no se renderizan widgets con datos vacíos transitorios.
- [x] AC2: Al terminar las consultas, la grilla y sus widgets se renderizan como antes y desaparece el estado de sincronización.
- [x] AC3: Tests de vista cubren carga y estado listo; no se agregan ni duplican solicitudes API.
- [x] AC4: Tres capturas staging registran offsets de `main-content` y `server-clock`; la mediana de `server-clock` mejora al menos 50 ms respecto de spec043 (674,76 ms), sin aumentar el conteo API de 20 por arranque.
- [x] AC5: Tres Lighthouse fríos guardan score, FCP, LCP, TBT, CLS y candidato LCP; el resultado no atribuye causalidad si las muestras no permiten sostenerla.
- [x] AC6: Tests focalizados, lint, formato, tipos, build/presupuesto, `spec:check`, `docs:check` y preflight pasan.

## Restricciones

- Mantener el contrato visual estable cuando los datos estén listos; el cambio solo anticipa la bienvenida en el estado de carga.
- Preservar todos los hooks y efectos de widgets detrás de la condición de datos listos.
- No modificar reglas de React Query ni modificar el backend.
- `Dashboard.view.tsx` está marcado `UI-PROTECTED`; el usuario autorizó continuar con este cambio en esta sesión y el PR que eventualmente lo incluya debe llevar `ui/human-approved` antes de merge.
- Rollback: restaurar el early return previo que reemplaza toda la vista por el spinner.

## Trazabilidad

- Tests: `frontend/src/tests/features/dashboard/DashboardView.test.tsx` y `frontend/e2e/performance.spec.ts`.
- Evidencia base: `../043-dashboard-health-query-deduplication/evidencia/lighthouse-cold-profile.json` y `comparison.json`.
- Evidencia de salida: `evidencia/resultado-2026-10-23.md`, `evidencia/dashboard-startup-api-requests.json` y `evidencia/lighthouse-cold-profile.json`.
- Registro: `.jules/bolt.md`.
