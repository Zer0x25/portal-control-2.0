# Consistencia de importación y exportación

Tanda 4 posterior a [025](spec.md), con origen en las deudas de [021](../021-fastify-importacion-exportacion/spec.md).

## Contrato correctivo

- Ambos schemas de exportación aceptan fechas civiles reales (años 0001–9998)
  y rangos ordenados. Fechas imposibles, repetidas o invertidas devuelven 400
  antes del renderer, también en Excel. Se conservan los dos schemas, los modos
  y sus errores históricos: `detailed` pasa el router pero falla el controller;
  no se traduce a `compiled_detailed`. No se amplían permisos ni scopes de quiosco.
- Preview valida mapping como objeto de entradas `{prop,type?,required?}`. `prop`
  debe ser texto no vacío; destinos duplicados o reservados (`__proto__`,
  `constructor`, `prototype`), entradas nulas y extras devuelven 400. Mapping
  ausente sigue usando cabeceras. `type` ausente conserva valores raw históricos;
  solo `String` convierte valores no nulos a texto. `required` es metadata, no
  validación de filas. Filas se construyen sin prototipo.
- El frontend serializa el constructor `String` como el texto `String`: JSON
  eliminaba antes esta propiedad, impidiendo convertir identificadores numéricos.
  Mantiene metadata `required`, archivo, sesión y respuesta de preview.
- Asistencia, horas extra, anomalías y cobertura generan PDF reales con PDFKit,
  cabecera, pie numerado, filas alternadas y paginación. Celdas excepcionalmente
  largas se continúan en páginas siguientes. Sin filas se muestra un mensaje.
  Correo reconoce automáticamente la cabecera PDF y entrega MIME/extensión PDF.
- Los cuatro reportes usan hoy civil de Chile como extremo predeterminado,
  respetan employeeId/área/cargo y excluyen registros/asignaciones/patrones
  borrados. Cobertura cuenta empleados distintos por patrón en el rango;
  asignaciones repetidas del mismo empleado no incrementan cobertura.
- Las horas aceptan marcas ISO con zona explícita como instantes (incluido DST)
  y marcas legacy HH:mm como reloj de Chile con cruce nocturno. Marcas inválidas
  o intervalos ISO invertidos aportan cero, evitando NaN en los PDF.
- Calendario enumera días a mediodía UTC y consulta un único contexto por lote
  antes del recorrido. La programación recibe el día civil correcto en Chile,
  incluso durante DST. Fechas predeterminadas parten del mes chileno.
  Timestamps de generación y turnos usan explícitamente America/Santiago.
  La fecha civil del reporte de turno conserva sus campos UTC almacenados,
  igual que su DTO; no se desplaza al día anterior como un instante.

- Si falla el cálculo del PDF detallado, se descarta el documento y el adaptador
  devuelve el error HTTP neutral. Ya no devuelve un PDF 200 con el mensaje interno
  de base de datos. Excel conserva el límite de error después del primer byte.

## Evidencia y límites

Pruebas de paridad rechazan mapping estructural inválido y fechas inválidas sin
escrituras ni renderer; aceptan metadata del frontend. Unitarias cargan los cuatro
PDF con pdf-lib y verifican filtros, día chileno al cambiar año, paginación y
contexto único durante DST. Una prueba frontend verifica el FormData real.

QA local con Poppler: texto extraído confirma José Muñoz, 11 horas de asistencia,
2 horas extra, anomalía manual y cobertura 1 pese a dos asignaciones. Inspección
visual de tablas y paginación con 70 empleados/nombre excepcionalmente largo.
Fixtures y PNG temporales quedan fuera del repositorio.

Preview conserva 50 MiB comprimidos y carga completa en memoria; no se afirma
protección contra expansión ZIP ni validación/importación persistente. Fórmulas,
rich text y otros tipos siguen siendo valores raw; no se evalúan fórmulas.
PDF y KPI siguen materializando datasets. Excel conserva streaming y el error
histórico de ZIP parcial si KPI falla después del primer byte. La regla de 9 horas
para horas extra no cambia; marcas mixtas ISO/HH:mm usan reloj de Chile sin
garantía de duración DST, pues la marca legacy carece de fecha/zona. No hay benchmark ni garantía
de memoria constante. Contratos de Usuario, quiosco, Excel y reporte inexistente
conservan sus diferencias históricas salvo los rechazos de datos aquí descritos.

Cierre: 731 pruebas de integración Express/Fastify sobre PostgreSQL 18.4
desechable; 25 unitarias/contrato; 280 frontend. Ambos CI secuenciales, SDK,
docs/specs/secret-scan y diff-check correctos. Sin migración ni nuevas dependencias.
