# Plan 071: aislar los renders del loading de navegación

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Confirmar que `useNavigationLoading` solo se monta desde `App` y conservar su
   función/test existentes.
2. Extraer una `NavigationLoadingController` memoizada que renderiza `null` y
   registrar sus commits en desarrollo mediante `profileReactSubtree`.
3. Ejecutar los tests del hook y tres perfiles fríos con el mismo entorno de
   Spec 070; comparar commits de `app:application`, `app:routes` y el controller.
4. Mantener el cambio solo si reduce al menos 20% la mediana de commits de
   `app:application`; de lo contrario, revertir la extracción y documentar el
   resultado negativo.
5. Ejecutar preflight, build y gates de especificación/documentación antes del
   commit.

## Archivos a tocar

| Archivo                                         | Cambio                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| `frontend/src/App.tsx`                          | Separar el controller memoizado y retirar la suscripción del root. |
| `specs/071-isolate-navigation-loading-renders/` | Registrar criterio, comparación y evidencia.                       |
| `.jules/bolt.md`                                | Anotar el resultado y siguiente foco.                              |

## Riesgos y rollback

La subida de `startLoading`/`stopLoading` a un componente hijo puede cambiar el
orden de efectos. Rollback: volver a invocar `useNavigationLoading` desde `App`
y retirar el scope del controller.

## Verificación

`fnm exec --using=26.10.0 -- npm --prefix frontend run check`,
`npm --prefix frontend run test:run -- src/tests/hooks/useNavigationLoading.test.tsx`,
`measure:renders -- --route=time-control --viewport=mobile --cpu-throttle=4
--samples=3`, build de producción, `npm run spec:check`, `npm run docs:check`,
`npm run lint:budget` y preflight antes del commit.
