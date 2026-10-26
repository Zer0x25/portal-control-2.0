# Spec 072: acotar la suscripción auth del shell

- Estado: Aprobado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

Spec 070 midió 26–32 commits de `App` durante el primer segundo. Spec 051 ya
consolidó `useAuth` a una suscripción superficial, pero la selección general
incluye `currentUser`, `isAuthenticated`, `isAuthLoading` y campos MFA. `App`
solo consume `isForcePasswordChangeModalOpen`, `clearMustChangePassword` y
`logout`, por lo que puede renderizar por cambios de auth que no alteran su UI.

## Alcance

Dentro:

- Crear un selector superficial dedicado para los tres campos que usa `App`.
- Probar reactividad del modal y acciones, e ignorar cambios a campos auth no
  usados por el shell.
- Comparar tres perfiles fríos de Control Horario con el baseline Spec 070.
- Conservar el cambio solo si la mediana de commits de `app:application` baja al
  menos 20%; de lo contrario, revertirlo.

Fuera (explícito):

- Cambiar el contrato existente de `useAuth`, los flujos auth, MFA, backend,
  requests, queries o UI.
- Afirmar una mejora de producción/Core Web Vitals a partir de Profiler dev.
- Guardar valores personales del usuario o tokens.

## Criterios de aceptación

- [x] AC1: `App` usa un hook con una suscripción superficial a solo modal,
      `clearMustChangePassword` y `logout`.
- [x] AC2: Tests verifican una suscripción, actualización del modal y ausencia
      de render por cambios a `isAuthLoading`/MFA o campos de usuario no usados.
- [x] AC3: Tres contextos registran los mismos scopes y ventanas que Spec 070,
      sin requests/markers extra ni pérdidas del buffer.
- [x] AC4: La mediana de commits de `app:application` baja ≥20% respecto a
      baseline 29; si no, se revierte el hook nuevo y el cambio de `App`.
- [x] AC5: El resultado separa conteos de Profiler de latencia/CWV de producción.

## Restricciones

El perfil incluye overhead de React Profiler en desarrollo. Scopes padres e
hijos se solapan y no se suman. La base de comparación es n=3 de Spec 070; si
las muestras no alcanzan el gate, no se conserva un cambio con beneficio incierto.

## Trazabilidad

- Código: `frontend/src/App.tsx`, `frontend/src/hooks/useAuth.ts` y
  `frontend/src/tests/hooks/useAuthSubscriptions.test.tsx`.
- Antecedentes: Specs 051, 070 y 071.
- Evidencia: `evidencia/app-auth-render-profile-2026-10-24.json` y
  `evidencia/resultado-2026-10-24.md`.
- Bitácora: `.jules/bolt.md`.
