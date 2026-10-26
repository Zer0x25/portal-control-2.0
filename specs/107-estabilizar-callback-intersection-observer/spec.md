# Spec 107: Estabilizar Callback Intersection Observer

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-25
- ADR relacionado: N/A

## Problema

El perfil de escritorio de Control horario registró 16, 8 y 15 commits del scope
`time-control:records` en tres muestras. `useInfiniteVirtualizedList` entrega un
callback `onChange` nuevo en cada render, mientras `useIntersectionObserver`
incluye esa identidad entre las dependencias del efecto y guarda cada entrada en
estado. Además, `frozen` parte en `undefined` y pasa a `false` en la primera
notificación cuando `freezeOnceVisible` está apagado. El efecto vuelve a
desconectar y crear el observador; en la lista, el callback nuevo puede repetir
ese ciclo con cada entrada.

## Alcance

Dentro:

- Mantener un único observador cuando cambia la identidad del callback.
- Mantener `frozen` en un valor booleano estable cuando la opción está apagada.
- Entregar notificaciones al callback más reciente sin reiniciar el observador.
- Probar una notificación que actualiza el estado del hook y una actualización
  posterior del callback.
- Repetir el perfil React de escritorio con el mismo viewport y throttling.

Fuera (explícito):

- Cambiar la geometría, paginación o estado de las listas.
- Editar `TimeControl.view.tsx`, que permanece protegida.
- Afirmar una reducción de TBT, CPU de producción o Lighthouse a partir del
  perfil React de desarrollo.

## Criterios de aceptación

- [x] AC1: Al recibir una entrada que actualiza el estado del hook, el callback
      cambiante y `freezeOnceVisible: false` no provocan desconexión ni crean un
      segundo `IntersectionObserver`.
- [x] AC2: Si el callback se reemplaza, la siguiente entrada se entrega al
      callback nuevo sin recrear el observador; `freezeOnceVisible: true` sigue
      desconectándolo después de intersectar.
- [x] AC3: Tres perfiles de escritorio comparan commits de la ruta, registros y
      filtros antes/después; el informe conserva muestras individuales, reporta
      la dispersión y limita la conclusión al perfil de desarrollo.
- [x] AC4: Test focalizado, TypeScript, ESLint, build, `spec:check`, `docs:check`
      y preflight pasan; la vista protegida queda intacta.

## Restricciones

Constitución I–V. Sin cambios de API, OpenAPI, SDK, Prisma, IndexedDB ni datos de
staging. Rollback: revertir la referencia estable y normalización booleana si
deja de entregarse una notificación al callback vigente o cambia el
comportamiento de listas.

## Trazabilidad

- Tests: `frontend/src/tests/hooks/useIntersectionObserver.test.tsx`.
- Evidencia React: perfiles de `/#/time-control`, Chromium, viewport 1440×900,
  CPU 4× y tres muestras por lado.
- Docs: resultado de la spec y entrada del Bolt Journal.
