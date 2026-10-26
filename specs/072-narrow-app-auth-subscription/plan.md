# Plan 072: acotar la suscripción auth del shell

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Añadir `useAuthShellControls` con una selección superficial solo de los tres
   valores usados por `App`; mantener intacto `useAuth`.
2. Cambiar `App` al selector nuevo y probar que acciones/modal siguen reactivos
   y campos MFA/cambios de usuario irrelevantes no causan render.
3. Ejecutar tres perfiles con los parámetros de Specs 070–071. Comparar la
   mediana de `app:application` con 29 commits del baseline Spec 070.
4. Si la mediana no baja al menos 20%, retirar hook y uso en App; conservar el
   perfil como experimento negativo.
5. Correr preflight, build y gates SDD antes del commit.

## Archivos a tocar

| Archivo                                                  | Cambio                                                      |
| -------------------------------------------------------- | ----------------------------------------------------------- |
| `frontend/src/hooks/useAuth.ts`                          | Añadir selector específico del shell sin cambiar `useAuth`. |
| `frontend/src/App.tsx`                                   | Suscribirse solo a los campos que el shell consume.         |
| `frontend/src/tests/hooks/useAuthSubscriptions.test.tsx` | Probar selector acotado y reactividad.                      |
| `specs/072-narrow-app-auth-subscription/`                | Guardar baseline, comparación y decisión.                   |
| `.jules/bolt.md`                                         | Anotar resultado y siguiente foco.                          |

## Riesgos y rollback

Si el hook dedicado permite que el modal de cambio obligatorio pierda una
actualización o altera logout, revertir los dos usos y conservar solo evidencia.
Si el gate de commits falla, revertir aunque los tests pasen.

## Verificación

`npm --prefix frontend run test:jsdom -- src/tests/hooks/useAuthSubscriptions.test.tsx src/tests/state/forcePasswordChangeSession.test.tsx`,
`fnm exec --using=26.10.0 -- npm --prefix frontend run check`,
`measure:renders -- --route=time-control --viewport=mobile --cpu-throttle=4
--samples=3`, build de producción, `npm run spec:check`, `npm run docs:check`,
`npm run lint:budget` y preflight.
