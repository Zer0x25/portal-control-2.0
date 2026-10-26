# Plan 051: Reducir suscripciones duplicadas del estado de autenticación

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

Cómo se implementa en 3-6 pasos. Sin código, solo decisiones técnicas.

1. Añadir primero una prueba de hook que cuente las llamadas a `useStore.subscribe`
   y falle mientras `useAuth` mantenga nueve selectores.
2. Cambiar `useAuth` a un selector de objeto con `useShallow`; conservar los
   mismos campos, referencias de acciones y derivación del indicador de cambio
   obligatorio de contraseña.
3. Reunir en una sola llamada los campos de `useAuth` usados por `App`.
4. Ejecutar pruebas enfocadas y type check; reconstruir frontend de staging.
5. Repetir tres perfiles CDP de Dashboard con CPU 4×, repetir la batería
   `perf:staging` y documentar métricas por muestra, sin atribuirle una
   reducción de TBT si los resultados no la respaldan.

## Archivos a tocar

| Archivo                                                  | Cambio                                                  |
| -------------------------------------------------------- | ------------------------------------------------------- |
| `frontend/src/hooks/useAuth.ts`                          | Unificar los selectores en una suscripción superficial. |
| `frontend/src/App.tsx`                                   | Reutilizar una sola lectura de `useAuth`.               |
| `frontend/src/tests/hooks/useAuthSubscriptions.test.tsx` | Cubrir suscripciones únicas y reactividad.              |
| `specs/051-auth-store-subscriptions/*`                   | Guardar criterios, plan, tareas y resultados medidos.   |
| `.jules/bolt.md`                                         | Registrar la evidencia y el próximo foco.               |

## Contratos afectados

Sin cambios de contratos HTTP, Prisma, OpenAPI o SDK.

## Riesgos y rollback

Una comparación superficial incompleta podría dejar de notificar un campo de
auth; una comparación mal definida podría causar renders. La prueba cubre los
campos derivados y cuenta una sola suscripción. Rollback: restaurar el hook
anterior y eliminar la consolidación de llamadas en `App`.

## Verificación

Comandos exactos (`npm run test:jsdom -- src/tests/hooks/useAuthSubscriptions.test.tsx`,
`npm run check`, `npm run build`, pruebas E2E enfocadas, tres perfiles CPU 4×,
`npm run perf:staging` y `npm run preflight`).
