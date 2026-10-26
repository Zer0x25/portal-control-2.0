# Plan 107: Estabilizar Callback Intersection Observer

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Añadir una regresión con un `IntersectionObserver` controlado. El callback
   del componente cambia en cada render y la notificación simulada actualiza el
   estado del hook.
2. Mantener la identidad del callback vigente en una referencia actualizada por
   efecto; quitar `onChange` de las dependencias que crean y destruyen el
   observador. Normalizar `frozen` a booleano para que la opción apagada no
   cambie de `undefined` a `false` después de la primera entrada.
3. Probar que una notificación actualiza `entry`, no reconstruye el observador,
   llama al callback nuevo tras cambiarlo y conserva la desconexión cuando
   `freezeOnceVisible` está habilitado.
4. Repetir tres perfiles React de escritorio y comparar commits por scope y
   duración, sin interpretar los tiempos de desarrollo como TBT.
5. Ejecutar gates locales, inspeccionar el diff y cerrar la spec con evidencia.

## Archivos a tocar

| Archivo                                                     | Cambio                                                      |
| ----------------------------------------------------------- | ----------------------------------------------------------- |
| `frontend/src/hooks/useIntersectionObserver.ts`             | Actualizar el callback vigente sin reiniciar el observador. |
| `frontend/src/tests/hooks/useIntersectionObserver.test.tsx` | Regresión de reinicio y callback vigente.                   |
| `specs/107-estabilizar-callback-intersection-observer/*`    | Criterios, plan, tareas y evidencia.                        |
| `.jules/bolt.md`                                            | Registrar el resultado y el siguiente foco.                 |

## Contratos afectados

Sin endpoints, contratos HTTP, OpenAPI, SDK, esquemas Prisma ni migraciones.

## Riesgos y rollback

El callback del observador podría quedar atrasado si la referencia no se
actualiza antes de procesar nuevas entradas. El test reemplaza el callback y
comprueba que la siguiente notificación llega al más reciente. Revertir la
referencia si alguna lista deja de paginar al intersectar su sentinel.

## Verificación

Desde `frontend/`: `npm exec -- vitest run --project=jsdom
src/tests/hooks/useIntersectionObserver.test.tsx`, `npm run check`, lint
focalizado, `npm run build` y tres perfiles con `measure-renders.mjs`. Desde la
raíz: `npm run spec:check`, `npm run docs:check` y
`node .agents/skills/ci-preflight/scripts/preflight.cjs`.
