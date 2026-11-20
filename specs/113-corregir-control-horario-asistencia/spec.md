# Spec 113: Corrección de control horario y asistencia

- Estado: Implementado y validado localmente
- Autor: equipo portal-control
- Fecha: 2026-11-18
- ADR relacionado: N/A

## Problema

La replicación documentada en [control horario y asistencia](../../docs/flows/control-horario-y-asistencia.md) identificó nueve defectos abiertos: falsos fallos de integridad por rango, persistencia parcial de lotes, pérdida de una salida concurrente en el cierre, filtros incompletos, exportaciones y papel incompletos, marcaje habilitado con estado desconocido, indicador de edición ausente y una acción de novedad que no funciona. La evidencia y sus límites están en la sección 6 de ese documento.

## Alcance

Dentro: BUG-01 a BUG-09, preservar registros existentes y reglas de acceso, cobertura de regresión y actualización de evidencia del flujo. Incluir la discrepancia comprobada del límite de cierre automático de ANOMALÍA-04 para alinear la interfaz con la regla vigente del servidor.

Fuera: añadir Express o modificar datos históricos. La política de Supervisor y el destino de novedades se aplican según la decisión del usuario indicada abajo. Las demás hipótesis no comprobadas del flujo no se declaran resueltas sin evidencia.

## Criterios de aceptación

- [x] AC1: Al verificar un rango de fechas, cada fila se contrasta con su predecesor real en el orden de su cadena, aunque esté fuera del rango o sus fechas estén intercaladas; una cadena íntegra no produce falsas roturas y una alteración real se detecta. Definir y probar el significado de `limit` según el contrato publicado, sin omisiones silenciosas.
- [x] AC2: Un lote válido se guarda íntegro y se sella con auditoría coherente; ante un fallo en cualquier posición, incluida la 51, no queda ninguna fila ni auditoría de éxito del lote. La respuesta HTTP refleja el resultado.
- [x] AC3: Tanto el cierre manual como el programado adquieren bloqueo por empleado y revalidan la jornada dentro de la transacción antes de modificarla. Si una salida concurrente ya completó la jornada, se conserva; dos cierres concurrentes no generan cierres ni auditorías duplicadas.
- [x] AC4: Los filtros de área y jornada ofrecen todas las opciones aplicables sin truncarlas por una página de 50; seleccionar una opción disponible filtra correctamente, también con más de 50 registros y rangos distintos.
- [x] AC5: CSV, Excel e impresión/PDF representan el mismo conjunto completo que la consulta filtrada, incluyendo nombre, área, jornada, estado, anomalías, rango y alcance autorizado, incluso con más de una página. Cualquier límite real se comunica sin presentar una exportación parcial como completa.
- [x] AC6: Mientras se carga o falla la consulta necesaria para determinar el estado actual de un empleado, la consola indica estado no disponible y deshabilita acciones de marcaje; al recuperar datos fiables habilita solo acciones compatibles. La caché no se presenta como estado actual confirmado tras fallo.
- [x] AC7: Una edición real queda indicada en su fila y concuerda con el historial, con el nombre de acción efectivamente persistido y sin depender de que el evento esté en la primera página de auditoría. Mantener correctos los indicadores de correcciones pendientes sin asumir cobertura no demostrada.
- [x] AC8: Agregar novedad abre un formulario y guarda el contenido en la bitácora del turno abierto vinculado a la jornada; al volver a consultar se muestra el contenido persistido. Si no hay turno abierto o falla el guardado, se comunica el motivo y no se simula éxito.
- [x] AC9: En la frontera automática, la UI permite operar el primer día del mes anterior cuando el servidor lo permite; el cierre manual sigue siendo inclusivo y se respetan fechas anteriores bloqueadas.
- [x] AC10: Las pruebas ejercitan los casos señalados en servidor y UI, incluidos escritorio y móvil donde aplique, y comprueban que los datos preexistentes y los permisos de otros roles se conservan. Supervisor puede consultar y exportar y resolver correcciones, pero no realizar las demás mutaciones de jornadas ni marcajes; servidor y UI aplican esta política.

## Restricciones y supuestos

Fastify es el único servidor HTTP. Usar transacciones directas con `DIRECT_URL` y bloqueo por empleado donde corresponda; no introducir N+1 ni relajar ratchets. La regla contable vigente del servidor es el supuesto para AC9. Decisión del usuario: Supervisor solo consulta y exporta, y puede resolver correcciones. La novedad se guarda en la bitácora del turno abierto vinculado a la jornada; investigar y reutilizar el modelo y contrato reales para persistirla, sin simular éxito. Cualquier decisión estructural permanente adicional requiere ADR.

## Trazabilidad

- Evidencia de origen: sección 6 del flujo enlazado arriba; no extrapolar pruebas más allá de sus límites.
- Pruebas: integridad y lote por HTTP con PostgreSQL aislado; carreras reales controladas; pruebas de UI y exportación multipágina; validación de roles y frontera contable.
- Documentación: actualizar el flujo con resultados observados y límites tras verificar cada corrección.
