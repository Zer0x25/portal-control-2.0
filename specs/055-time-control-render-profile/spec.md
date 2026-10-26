# Spec 055: Time Control Render Profile

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

Las corridas frías de Spec 039 dejan Control horario con LCP observado mediano de
1.661 s y TBT Lighthouse de 257,5 ms; las trazas concentran CPU en `react-core`,
pero no atribuyen el trabajo al árbol de la ruta. El profiler reutilizable de
Spec 052 no incluye Control horario, así que falta evidencia de React para decidir
qué código optimizar.

## Alcance

Dentro:

- Añadir medición de React Profiler para el árbol de Control horario y su vista, habilitada solo en desarrollo.
- Permitir que `measure:renders` ejecute una ruta y viewport específicos y preserve las muestras crudas y medianas de los perfiles anidados.
- Medir tres navegaciones aisladas de Control horario con API de staging y documentar límites y resultado.

Fuera (explícito):

- Cambiar lógica funcional, datos de staging, contratos HTTP o la vista marcada `UI-PROTECTED`.
- Tratar los milisegundos de Vite desarrollo como tiempo de producción, Lighthouse, LCP o costo CPU exclusivo.
- Aplicar una optimización funcional antes de identificar un hot path repetible.

## Criterios de aceptación

- [x] AC1: El límite del árbol de Control horario y el perfil anidado de su vista acumulan commits, fases y duraciones solo en desarrollo; el build de producción no instala perfiles.
- [x] AC2: `measure:renders -- --route=time-control --viewport=mobile --samples=3` mide navegaciones aisladas a 412×823, guarda cada muestra y calcula medianas por perfil.
- [x] AC3: Una corrida contra staging deja JSON versionado con las tres muestras de Control horario y registra los límites de la medición.
- [x] AC4: La evidencia separa costos de render de desarrollo de métricas Lighthouse/producción y no afirma una mejora funcional.
- [x] AC5: Pasan typecheck, lint, build, spec:check y docs:check; `TimeControl.view.tsx` permanece intacta.

## Restricciones

- No modificar `frontend/src/features/time-control/views/TimeControl.view.tsx`, marcada `UI-PROTECTED`.
- No cambiar API, OpenAPI, SDK, Prisma, base de datos ni datos de negocio.
- No comparar milisegundos de React Profiler de desarrollo con Lighthouse o perfiles CPU de producción.

## Trazabilidad

- Verificación: `frontend/scripts/measure-renders.mjs`, typecheck, lint, build de producción, `spec:check` y `docs:check`.
- Evidencia: `./evidencia/render-profile-2026-10-24.json` y `./resultado.md`.
