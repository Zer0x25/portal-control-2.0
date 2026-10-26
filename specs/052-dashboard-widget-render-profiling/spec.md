# Spec 052: Dashboard Widget Render Profiling

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

La evidencia de Spec 051 encontró que `react-core` concentra más muestras de CPU, pero las muestras del Dashboard aparecen repartidas entre React, hooks y contenedores; no hay tiempos exclusivos por widget. El profiler actual solo cuenta commits por ruta, por lo que no permite ordenar widgets con un costo repetible ni distinguir su tiempo de render del de Lighthouse.

## Alcance

Dentro:

- Registrar en modo desarrollo los commits, fase, `actualDuration` y `baseDuration` en los límites de perfilado ya existentes por ruta.
- Añadir límites de `React.Profiler` a los widgets del Dashboard desde el registro de widgets, sin editar `Dashboard.view.tsx`.
- Ampliar `measure:renders` para medir tres contextos nuevos por ruta, conservar las muestras crudas y resumir medianas por ruta y widget.
- Guardar una corrida contra el código actual y documentar qué permite concluir y cuáles son los límites del perfil de desarrollo.

Fuera (explícito):

- Cambiar lógica funcional, presentación, carga de datos o límites de widgets.
- Atribuir estos tiempos a la carga de producción, Lighthouse, INP o CPU exclusiva de una función.
- Establecer un umbral de regresión nuevo o modificar el gate de commits existente.

## Criterios de aceptación

- [x] AC1: En desarrollo, cada límite de ruta y widget acumula commits, conteos por fase, duración real acumulada, duración base acumulada y máximo por commit; conserva los contadores usados por la medición anterior.
- [x] AC2: La batería de renders hace tres navegaciones aisladas por ruta, devuelve las muestras individuales y calcula medianas comparables para commits y duraciones.
- [x] AC3: Los widgets se perfilan envolviendo sus componentes en el registro y el build de producción no instala esos límites adicionales.
- [x] AC4: Una corrida contra staging deja JSON versionado con Dashboard y widgets identificables, y la evidencia explica que los tiempos son de React en modo desarrollo.
- [x] AC5: Pasan typecheck, lint, chequeos de specs y documentación; la instrumentación mantiene intacta la vista protegida.

## Restricciones

- El profiler de widgets solo se habilita con `import.meta.env.DEV`; producción conserva los componentes originales del registro.
- No modificar `frontend/src/features/dashboard/views/Dashboard.view.tsx`, marcado `UI-PROTECTED`.
- No cambiar HTTP, OpenAPI, SDK, Prisma, base de datos ni datos de negocio.
- No comparar milisegundos de React Profiler de desarrollo con Lighthouse o perfiles CPU de producción.

## Trazabilidad

- Tests y verificación: `frontend/scripts/measure-renders.mjs`, `npm --prefix frontend run check`, `npm --prefix frontend run lint`, build de producción y una corrida aislada contra staging.
- Docs/evidencia: `./plan.md`, `./tasks.md` y `./evidencia/render-profile-2026-10-24.json`.
