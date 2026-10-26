# Spec 101: Evaluar el bail-out de React Compiler en el panel de marcación

- Estado: Descartado
- Autor: zer0x
- Fecha: 2026-10-25
- ADR relacionado: N/A

## Problema

El React Profiler de Control horario registra `clocking-panel` en tres commits y
6,9–10,6 ms acumulados por navegación. React Compiler omite `useClockingPanel`
porque devuelve `isSubmittingRef.current`, aunque ningún consumidor usa esa
propiedad. La captura encontró una oportunidad concreta de compilar el hook,
pero debe confirmarse en la ruta y contra Lighthouse antes de retener el cambio.

## Alcance

Dentro:

- Probar la retirada temporal del estado `isSubmitting` que no se consume en
  render y dejar que React Compiler procese el hook/componente.
- Preservar el `ref` como barrera síncrona y comprobar que dos intentos
  concurrentes producen una sola llamada a `mutateAsync`.
- Comparar perfiles React y cinco corridas Lighthouse con la imagen de Spec
  100; conservar el runtime solo si pasa el gate acordado.
- Mantener el registro diagnóstico si el experimento se descarta.

Fuera (explícito):

- Cambiar la lógica de marcación, el payload HTTP o `TimeControl.view.tsx`.
- Escribir marcaciones u otros datos de negocio en staging.
- Tratar tiempos de React Profiler de Vite desarrollo como tiempos de
  producción, TBT o INP.

## Criterios de aceptación

- [x] AC1: Una prueba confirma que dos intentos durante una mutación pendiente
      producen solo una llamada a `mutateAsync`; la protección sincronizada
      sigue intacta en el runtime restaurado.
- [x] AC2: La variante candidata compila sin el bail-out de
      `useClockingPanel`; TypeScript, ESLint y build de frontend pasan.
- [x] AC3: Se comparan tres perfiles React y cinco corridas Lighthouse contra
      Spec 100. El candidato no pasa el gate predefinido: transferencia +0,13%
      y TBT mediano +80%; se documentan también LCP estable y menor duración de
      React Profiler, sin atribuir causalidad.
- [x] AC4: El runtime candidato se revierte, staging vuelve a healthy, pasan
      preflight y verificaciones documentales, y no se escriben datos de
      marcación.

## Restricciones

El guard `isSubmittingRef` debe permanecer en el handler. La variante candidata
solo se retiene si el compilador elimina el bail-out, la transferencia no crece
y las medianas de TBT y LCP no empeoran más de 5%. Si falla el gate, rollback de
los cambios de runtime y registro del resultado.

## Trazabilidad

- Tests: `frontend/src/tests/components/time_control/ClockingPanel.spec.tsx`.
- Evidencia: `./evidencia/resultado.md`, perfiles React y Lighthouse.
- Bitácora: `.jules/bolt.md`.
