# Spec 095: evitar reaplicar el tema del bootstrap

- Estado: Completada
- Autor: zer0x
- Fecha: 2026-10-25
- ADR relacionado: N/A

## Problema

`frontend/index.html` fija la clase `.dark` antes de cargar React, usando la
misma preferencia `app-theme` que Zustand. Después, `useStore.ts` llama
`_applyTheme` otra vez al crear el store; esa llamada agrega un `<style>`, fuerza
un cálculo de estilos con `getComputedStyle` y agenda su eliminación aunque el
tema ya esté aplicado. Un perfil CDP de tres arranques fríos registró hasta
12,165 ms muestreados en `_applyTheme`; es una oportunidad pequeña, no una causa
probada de la variación de TBT.

## Alcance

Dentro:

- Hacer idempotente `_applyTheme`: actualizar `effectiveTheme`, pero omitir las
  operaciones de DOM si la clase actual ya coincide con el tema resuelto.
- Conservar la supresión de transiciones y el recálculo de estilos cuando una
  acción sí cambia el tema.
- Probar ambos caminos y capturar tres perfiles fríos en el mismo staging.

Fuera (explícito):

- Cambiar la preferencia persistida, el bootstrap estático, estilos de tema o
  `TimeControl.view.tsx` (`UI-PROTECTED`).
- Atribuir a este cambio una mejora de TBT sin mediciones consistentes.

## Criterios de aceptación

- [x] AC1: Si la clase `.dark` ya coincide con el tema resuelto, `_applyTheme`
      actualiza `effectiveTheme` sin insertar `#disable-transitions`, forzar
      estilos ni programar la limpieza; si el store ya coincide tampoco notifica
      otro cambio.
- [x] AC2: Si la clase no coincide, el cambio conserva la supresión temporal de
      transiciones, aplica el tema y agenda la limpieza existente.
- [x] AC3: E2E con `app-theme=dark` confirma que el bootstrap estático aplica
      `.dark` antes de React y que la hidratación del store no inserta el estilo
      de supresión. El frame de `_applyTheme` pasa de 12,165 ms muestreados en
      1/3 visitas a no aparecer en 3/3; el CPU total es variable y no permite
      atribuir una mejora de TBT.

## Restricciones

La clase puesta por el bootstrap temprano es la fuente visual durante el primer
pintado; Zustand debe seguir reflejando el mismo tema. Las acciones del usuario
que cambian tema deben mantener el comportamiento actual. Rollback: restaurar
las operaciones DOM incondicionales de `_applyTheme`.

## Trazabilidad

- Tests unitarios del slice de tema y E2E de inicialización en
  `frontend/e2e/performance.spec.ts`.
- Evidencia final: `./evidencia/resultado.md` y perfil CDP posterior.
- Bitácora: `.jules/bolt.md`.
