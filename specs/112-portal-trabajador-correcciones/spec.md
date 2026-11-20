# Spec 112: Portal del trabajador y correcciones

- Estado: Implementado y verificado localmente; límites en el flujo
- Autor: zer0x
- Fecha: 2026-11-17
- ADR relacionado: N/A

## Problema

La replicación del flujo identificó 17 fallas de concurrencia, auditoría, contratos, adjuntos, estado de marcaje y exportaciones. La evidencia y los límites de cada prueba constan en [el flujo](../../docs/flows/portal-trabajador-y-correcciones.md). El usuario aprobó las cinco propuestas de la sección 7 el 2026-11-17.

## Alcance

- Correcciones propias: creación, unicidad de pendientes, resolución, historial, cierre, cambios obsoletos, secuencia e integridad.
- Auditoría consistente con la transacción y eventos después del commit; validación de consultas y contratos Fastify/OpenAPI/SDK.
- Deshabilitar adjuntos sin almacenamiento; proteger estado de marcaje ante carga y fallo.
- Calendario, impresión, ICS y PDF en el rango visible, con horas Chile, salida segura y paginación.
- Pruebas de regresión y verificación en staging reconstruido. Conservar solicitudes y auditorías históricas; no eliminar ni modificar duplicados existentes automáticamente.
- Fuera de alcance: almacenamiento de adjuntos y reglas de retención, excepciones de reapertura de períodos y selector arbitrario de rango en UI.

## Criterios de aceptación

- [x] AC1: Por jornada/campo solo se crea una pendiente nueva, incluso concurrentemente; los duplicados históricos no se borran. La respuesta de conflicto y la lista de pendientes son coherentes con la UI.
- [x] AC2: Crear o aprobar en período cerrado falla; aprobar un valor obsoleto falla con conflicto, sin modificar jornada ni solicitud. Verificar cierre, valor y secuencia bajo protección transaccional concurrente.
- [x] AC3: Aprobaciones simultáneas de distintos campos no dejan secuencia inválida; la cadena de integridad permanece válida.
- [x] AC4: Auditorías y mutaciones se confirman o revierten juntas; ante fallo no hay auditorías fantasma ni éxito sin auditoría; eventos se emiten solo tras commit.
- [x] AC5: Consultas inválidas responden error de cliente; motivo exige texto; cuerpo, respuesta, OpenAPI y SDK describen el mismo contrato sin romper silenciosamente clientes existentes.
- [x] AC6: El formulario no ofrece adjuntos y el servidor rechaza con error claro un adjunto enviado por clientes antiguos, sin descartarlo silenciosamente.
- [x] AC7: Durante carga o fallo de la última jornada se bloquean acciones de marcaje, se informa el estado y se ofrece reintento ante error.
- [x] AC8: El trabajador consulta historial propio con fechas, estados, motivo de rechazo y responsable; datos ajenos siguen inaccesibles.
- [x] AC9: ICS exporta turnos propios del rango visible con fechas/horas Chile, incluso nocturnos y con caracteres especiales; si no hay eventos comunica el resultado sin éxito falso.
- [x] AC10: La impresión escapa todo contenido y atributos derivados de datos, refleja el rango y no anuncia éxito si se bloquea la ventana.
- [x] AC11: PDF y reporte muestran horarios en America/Santiago, respetan rango/datos y paginan correctamente, incluidos rangos largos y datos ya cacheados.
- [x] AC12: Los bugs 01–17 cuentan con regresiones pertinentes y evidencia de verificación staging; docs, ratchets, tipos, seguridad e integridad pasan sin afectar datos ajenos.

## Restricciones

Fastify único; transacciones interactivas con DIRECT_URL y withDirectTransaction; no degradar ratchets ni introducir borrados de datos históricos. Cambios de contrato siguen api-contracts-sync y cambios transaccionales prisma-migration-safeguard. No se registra un ADR nuevo salvo que surja una decisión arquitectónica permanente no cubierta por las existentes.
