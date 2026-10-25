# Plan 084: Listas Tipografía Estándar

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Añadir una escala semántica de roles tipográficos de lista en `index.css` y documentar los cuatro grupos de presentación en la regla de diseño.
2. Registrar las superficies de listas cubiertas por el primer ciclo en un inventario leído directamente por el guardrail.
3. Migrar las tablas operativas, tarjetas responsivas, tablas de reporte/entidad y feeds/colas del inventario a los roles comunes; conservar diferencias de estructura y densidad.
4. Ampliar la prueba de `TimeRecordRow` y agregar un guardrail que rechace cursivas y clases faltantes en la lista registrada.
5. Ejecutar las pruebas de tipografía y componentes afectadas, TypeScript, ESLint de los archivos cambiados, formateo y `spec:check`.

## Archivos a tocar

| Archivo                                                                                   | Cambio                                                                    |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `frontend/src/index.css`                                                                  | Definir utilidades tipográficas semánticas para listas.                   |
| `.agents/rules/design-system-governance.md`                                               | Definir grupos, roles y reglas de consistencia.                           |
| `frontend/src/tests/guardrails/list-typography-groups.json`                               | Inventario de componentes registrados por grupo y utilidades requeridas.  |
| `frontend/src/tests/guardrails/listTypographyGuardrails.test.ts`                          | Validar el inventario, utilidades y ausencia de cursiva.                  |
| `frontend/src/features/time-control/components/TimeRecordRow.tsx`                         | Normalizar jerarquía de nombre, área, fecha y marcajes.                   |
| `frontend/src/features/time-control/components/TimeRecordTableViewDesktop.tsx`            | Normalizar encabezados del listado virtualizado.                          |
| `frontend/src/features/time-control/components/TimeRecordMobileCard.tsx`                  | Compartir roles tipográficos en tarjetas móviles.                         |
| `frontend/src/features/worker-portal/views/WorkerPortal.view.tsx`                         | Usar el mismo estándar en historial del trabajador.                       |
| `frontend/src/components/ui/ReportTable.tsx`                                              | Normalizar tabla y resúmenes de reportes, retirando cursiva de datos.     |
| `frontend/src/components/ui/ReportTableMobileSummaryCard.tsx`                             | Normalizar títulos, etiquetas y valores en móvil.                         |
| `frontend/src/components/ui/ReportTableMobileDailyCard.tsx`                               | Normalizar valores diarios y metadatos en móvil.                          |
| `frontend/src/features/employee-management/components/EmployeeListCard.tsx`               | Normalizar grilla y tabla de empleados.                                   |
| `frontend/src/features/governance/components/IntegrityAnomalyTable.tsx`                   | Normalizar la tabla de anomalías.                                         |
| `frontend/src/features/logbook/components/LogEntriesCard.tsx` y `SupplierEntriesCard.tsx` | Normalizar los feeds de actividad y proveedores.                          |
| `frontend/src/features/supervisor-dashboard/components/RequestsTabCards.tsx`              | Normalizar contenido narrativo y marcajes de las tarjetas de solicitudes. |
| `frontend/src/tests/components/time_control/TimeRecordRow.spec.tsx`                       | Proteger las clases de nombre y valores en ambos modos de fila.           |
| `frontend/package.json`                                                                   | Incluir el nuevo guardrail en `lint:guardrails` y `test:guardrails`.      |

## Contratos afectados

No hay cambios de rutas, schemas, OpenAPI, SDK ni base de datos.

## Riesgos y rollback

Las filas ganan legibilidad con contenido principal de 14 px, lo que puede ocupar más espacio horizontal en tablas densas. La versión operativa retiene sus columnas y scroll; los valores dejan de estrecharse con tracking negativo. Revertir las utilidades y migraciones de clases restaura la presentación previa.

## Verificación

```bash
npm run spec:check
npm --prefix frontend run test:run -- src/tests/guardrails/listTypographyGuardrails.test.ts src/tests/guardrails/typographyGuardrails.test.ts src/tests/components/time_control/TimeRecordRow.spec.tsx
npm --prefix frontend run check
npm --prefix frontend run lint
npm --prefix frontend run format:check
```
