# Comportamiento 021

Spec: [spec.md](spec.md).

- Dado Excel con Name/Value y filas Ada/0, Bob/null, preview devuelve ambas filas; mapping String transforma 0 en "0", conserva null y omite headers ausentes. No modifica empleados/registros.
- Sin archivo, 400 antes de parsear mapping; Excel corrupto/sin hojas 400; JSON mapping malformado mantiene 500 legacy. Fórmula/rich text se mantienen como objetos de celda.
- Import exige Supervisor o superior, incluido Reloj_Control; un archivo file hasta 50 MiB, sin filtro MIME. Rechaza exceso 413 y campo inesperado 400 antes de decoder.
- Calendar/report PDF requieren sesión. Usuario solo su employeeId y sin area/cargo; report también elimina mode. Calendar denial usa error 403; report denial usa solo message. Quiosco conserva scope legacy sin restricción equivalente.
- Excel requiere sesión. Usuario solo su employeeId pero conserva area; errores del schema del controller o autorización se convierten en 500 EXPORT_REPORT_EXCEL_ERROR. Schema router permite detailed, controller lo rechaza; compiled_detailed llega al renderer legacy sin traducción.
- Shift PDF requiere Supervisor o superior, incluido Reloj_Control. ID inexistente conserva error de servicio.
- PDF conserva buffer, Content-Type, Content-Length y nombre descargable. Excel conserva Writable, headers y finaliza si falla tras enviar bytes; no intenta responder JSON tras cabeceras.

TDD: tests/unit/importExportFlows.test.ts, cuatro pruebas RED antes de implementar. Integración real con PostgreSQL desechable y ambos adaptadores cubre autenticación, scope, decode/renderer reales y fallos inyectados. No exige igualdad byte a byte de PDFs con reloj/metadatos variables.

- Diez exports de cualquier ruta desde una IP consumen presupuesto incluso sin token; la onceava devuelve 429 solo message/Retry-After antes de maintenance/auth. Otra IP conserva presupuesto.
- KPI real falla después de que WorkbookWriter inicia ZIP: ambos adaptadores conservan 200 con ZIP parcial sin directorio final. Fallo inyectado antes de renderer devuelve JSON 500 estructurado.
