# Spec 051: Reducir suscripciones duplicadas del estado de autenticación

- Estado: Implementada
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

La captura de CPU de tres arranques fríos de Dashboard en staging (Chrome 153,
CPU 4×) encontró trabajo de `useAuth` dentro de `renderWithHooks`; los 32,8 ms
acumulados en ese contexto no representan el costo exclusivo del hook. Cada
llamada a `useAuth` ejecutaba nueve selectores `useStore`, y `App.tsx` lo
invocaba dos veces en el mismo componente. Esto multiplica las suscripciones a
Zustand y el trabajo de selección al actualizar el estado global.

## Alcance

Dentro:

- Consolidar los nueve selectores de `useAuth` en una selección superficial
  y una suscripción por consumidor.
- Usar una sola llamada a `useAuth` en `App`.
- Verificar el conteo de suscripciones y la reactividad de los campos de auth.
- Medir el arranque de Dashboard antes y después en staging y guardar la
  evidencia por muestra.

Fuera (explícito):

- Cambios al contrato público de `useAuth`, a otros hooks Zustand, a datos,
  endpoints o al diseño del Dashboard.
- Ajustar presupuestos Lighthouse por una variación aislada de TBT.

## Criterios de aceptación

- [x] AC1: Cada instancia montada de `useAuth` crea una sola suscripción a
      Zustand y devuelve el mismo contrato de campos existente.
- [x] AC2: Cambios a usuario, autenticación y `mustChangePassword` actualizan
      el resultado del hook; cambios a slices no relacionados no provocan
      renders del consumidor.
- [x] AC3: `App` consume `useAuth` una sola vez y los flujos de autenticación,
      salida y cambio obligatorio de contraseña siguen pasando sus pruebas.
- [x] AC4: La medición pre/post conserva tres perfiles fríos comparables y la
      batería de staging pasa; se reportan FCP, LCP, TBT y tiempo muestreado por
      script. TBT se informa, sin gate rígido, según la metodología de Spec 039.

## Restricciones

Constitución aplicable I–V; no cambia API, persistencia ni modelo de datos.
Mantener la comparación de selecciones superficial para no provocar renders
por objetos nuevos. Si cambia la reactividad o los flujos de auth, revertir el
hook y conservar los perfiles como evidencia.

## Trazabilidad

- Tests que lo probarán: prueba de suscripción/reactividad de `useAuth`, tests
  de cambio de contraseña y batería E2E de rendimiento.
- Docs a actualizar: plan/tareas, resultado de Spec 051 y bitácora `.jules/bolt.md`.
