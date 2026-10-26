# Spec 085: reducir el bloqueo del hilo principal en Control horario

- Estado: Implementado (diagnóstico; sin cambio de runtime)
- Autor: zer0x
- Fecha: 2026-10-25
- ADR relacionado: N/A

## Problema

La Spec 083 bajó el LCP frío de Control horario a 2,26 s, pero registró un TBT
mediano de 249,51 ms en tres muestras. Un perfil anterior encontró una tarea
larga repetida tras FCP que combina trabajo de React, Socket.IO, solicitudes y
montaje de la ruta; no atribuyó el bloqueo a un solo origen. El staging activo
ahora usa otra imagen (`b99cf4…`), así que esos resultados no sustituyen un
baseline actualizado.

## Alcance

Dentro:

- Capturar cinco mediciones Lighthouse frías de Control horario en el mismo
  build de staging y documentar LCP, TBT, CLS, imagen y configuración.
- Perfilar tres sesiones de producción con source maps locales que coincidan
  byte a byte con los scripts activos, y atribuir las tareas largas a stacks
  repetidos.
- Aplicar un cambio de runtime solo si el nuevo perfil identifica una causa
  reproducible y existe una regresión funcional que proteja el comportamiento.
- Repetir las mediciones enfocadas y, si cambia runtime, la batería de rutas.

Fuera (explícito):

- Cambiar API, sincronización, autenticación o contratos HTTP.
- Editar `TimeControl.view.tsx`, protegido por las reglas del proyecto.
- Retrasar Socket.IO por conjetura o presentar TBT de laboratorio como INP real.
- Ejecutar la batería completa después de cada hipótesis diagnóstica.

## Criterios de aceptación

- [x] AC1: Cinco muestras frías de Control horario se capturan en el mismo
      staging/build, con viewport 412×823, CPU 4×, almacenamiento frío y
      registros de FCP/LCP/TBT/CLS; se verifica que la imagen no cambie durante
      la captura.
- [x] AC2: Tres perfiles CDP de producción validan paridad exacta de los assets
      (excepto el comentario `sourceMappingURL`) y guardan stacks fuente
      saneados, sin URLs, credenciales ni datos de API. Lighthouse registra las
      tareas largas por bundle; no se afirma correlación temporal exacta entre
      esas tareas y cada stack del perfil CDP.
- [x] AC3: Ningún cambio de runtime se conserva salvo que la misma tarea o
      función aparezca en al menos dos perfiles y el experimento mejore TBT
      mediano al menos 20% o lo deje bajo 200 ms. No apareció un candidato de
      runtime que cumpliera la atribución causal requerida; no se cambió la app.
- [x] AC4: Si cambia runtime, cinco muestras posteriores usan el mismo método;
      TBT mediano cumple AC3, LCP mediano no empeora más de 5%, CLS máximo es
      `<= 0.01`, y las pruebas funcionales de los eventos afectados pasan (no
      aplica: no hubo cambio de runtime).
- [x] AC5: Si cambia runtime, el rebuild y la batería final conservan las rutas
      de readiness y las aserciones Lighthouse existentes, sin errores API ni
      regresión LCP mayor a 10% en Dashboard y Worker Portal (no aplica: no hubo
      cambio de runtime).
- [x] AC6: El informe distingue resultados de medición, causa atribuida,
      variación y límites; si la evidencia no justifica código, se conserva el
      diagnóstico y se documenta que no hubo cambio de runtime.

## Restricciones

Constitución V: spec, plan y tareas preceden al cambio. No cambiar umbrales
globales ni ratchets. Todo cambio de Socket.IO debe preservar autenticación,
reconexión, invalidación de queries y ciclo logout/desmontaje. Rollback: revertir
el cambio funcional y mantener únicamente las pruebas y evidencia reproducible.

## Trazabilidad

- Tests que lo probarán: perfil CDP/Lighthouse focalizado, pruebas de
  `useSocketEvents` si aplica y `npm run perf:staging` tras un cambio funcional.
- Docs/evidencia: `./plan.md`, `./tasks.md`, `./evidencia/resultado.md` y
  actualización de `.jules/bolt.md`.
