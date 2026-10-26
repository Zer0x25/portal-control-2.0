# Spec 083: Time Control Bootstrap Shell

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

La carga fría de Control Horario tiene LCP Lighthouse simulado mediano de
5.491 ms (tres muestras, imagen `3211e650…`) y FCP de 3.712 ms. El shell HTML
temprano solo admite Dashboard y Portal del Trabajador en `frontend/index.html`;
la prueba de shell de Control Horario registra el encabezado visible alrededor
de 2.129 ms, después de descargar y ejecutar React. La API responde rápido en
la traza observada; la demora está antes del primer contenido principal, no en
el tiempo de respuesta del servidor.

## Alcance

Dentro:

- Mostrar un shell HTML estático, sin datos de negocio, al cargar en frío
  `#/time-control` cuando existe sesión.
- Reutilizar el título genérico `Preparando el portal` y conservar el reloj y
  la fecha temporales existentes.
- Mantener visible e interactivo el overlay de sincronización al aparecer;
  conservar la ruta protegida y el contenido de `TimeControl.view.tsx`.
- Registrar el resultado de la batería idéntica antes y después del cambio.

Fuera (explícito):

- Cambios en APIs, autenticación, almacenamiento, datos de negocio o estrategia
  de sincronización.
- Editar archivos `UI-PROTECTED`, en especial `TimeControl.view.tsx`.
- Afirmar Core Web Vitals de campo sin datos de usuarios reales.

## Criterios de aceptación

Criterios de aceptación verificables, uno por línea, estilo Given/When/Then
o checklist medible:

- [x] AC1: Una sesión autenticada que carga directamente `#/time-control`
      recibe el shell con el encabezado `Preparando el portal` antes de que React
      monte el contenido, y el shell se elimina cuando cambia la ruta.
- [x] AC2: La batería fría mantiene tres muestras y valida la URL/ruta; la
      mediana Lighthouse simulada de LCP de Control Horario baja al menos 30% desde
      5.491 ms, con meta de hasta 2.500 ms. Este resultado es de laboratorio, no de
      campo.
- [x] AC3: Las tres muestras de Dashboard y Portal del Trabajador no empeoran
      más de 10% en LCP; CLS se mantiene en `<= 0.01` para las tres rutas.
- [x] AC4: Sin sesión el shell no aparece; el contenido protegido mantiene su
      guard de rol y el CSS del root sigue oculto hasta que la hoja de estilos está
      lista. En Control Horario, el overlay se renderiza sobre el shell y al
      montarse lo retira para que sus indicadores de progreso y su hit testing
      permanezcan visibles; Dashboard y Portal del Trabajador conservan el orden
      previo y esperan el reloj real.

## Restricciones

Constitución V: spec, plan y tareas preceden al cambio. Sin cambios de contrato
ni migraciones. La ruta solo muestra texto genérico tras detectar una sesión;
no revela datos ni reemplaza la autorización de React. Rollback: revertir los
cambios de bootstrap, overlay, CSP y sus pruebas.

## Trazabilidad

- Tests que lo probarán: `frontend/e2e/performance.spec.ts`, guard CSP del
  bootstrap, `npm run perf:staging`.
- Docs/evidencia: `./plan.md`, `./tasks.md`, los registros versionados de
  `specs/039-frontend-performance-battery/evidencia/runs/` y
  `./evidencia/resultado-2026-10-24.md`.
