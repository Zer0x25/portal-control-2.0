# Behavior 006: Ejemplos de consulta de feriados

Spec: [spec.md](./spec.md). B1–B6 se automatizaron en T1 y pasaron sobre el
servicio existente, con Prisma y red simulados. Evidencia y límites en
[baseline.md](./baseline.md). No equivalen a integración con PostgreSQL o al router real.

| ID  | Dado                                                              | Cuando                                                | Entonces                                                                                                     | AC  |
| --- | ----------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --- |
| B1  | Reloj fijo y feriados pasados/futuros; autosync deshabilitado     | Consulto sin `since` ni archivados                    | Se usa la fecha de negocio para excluir pasados; fecha descendente y metadatos de sincronización conservados | AC1 |
| B2  | Datos con distintas fechas y nombres; autosync deshabilitado      | Consulto búsqueda, archivados y página 2 de tamaño 10 | Se conservan filtros, offset, límite, `data` y `meta`, incluido total                                        | AC1 |
| B3  | Timestamp `since` válido                                          | Consulto delta                                        | Se filtra por `updatedAt`, no por fecha actual; no se inicia autosync                                        | AC1 |
| B4  | Sin feriados del año del reloj; autosync habilitado y sin `since` | Consulto y sincronización tiene éxito                 | Se sincroniza ese año y se vuelve a consultar con los mismos filtros                                         | AC2 |
| B5  | Feriados del año presentes, o autosync deshabilitado              | Consulto sin `since`                                  | No se llama al proveedor externo                                                                             | AC2 |
| B6  | Autosync necesario y proveedor falla                              | Consulto                                              | Se propaga el error existente; no se devuelve un éxito fabricado                                             | AC2 |

El test debe comprobar resultados y efectos relevantes, no cada llamada interna.
Inyectar reloj y dependencias; usar fixtures propias y red sustituida.

## Frontera HTTP

Añadir pruebas contra el router real con autenticación y validación cuando se
toque su composición. El test del controller con middleware simulado no demuestra
por sí solo que los permisos de la ruta real se mantengan.

Confirmar respuestas paginadas/no paginadas y errores con la baseline. Discrepancias
entre OpenAPI y runtime se registran por separado, no se corrigen silenciosamente.

## Matriz de evidencia

| Escenario | Ruta del test y nombre                                | Baseline   | Resultado tras extracción |
| --------- | ----------------------------------------------------- | ---------- | ------------------------- |
| B1        | `tests/unit/holidays/getHolidays.test.ts`, test `B1:` | PASS       | PASS tras extracción      |
| B2        | mismo archivo, test `B2:`                             | PASS       | PASS tras extracción      |
| B3        | mismo archivo, test `B3:`                             | PASS       | PASS tras extracción      |
| B4        | mismo archivo, test `B4:`                             | PASS       | PASS tras extracción      |
| B5        | mismo archivo, dos casos `B5:`                        | PASS (2/2) | PASS tras extracción      |
| B6        | mismo archivo, test `B6:`                             | PASS       | PASS tras extracción      |

El nuevo límite de dependencias se prueba en `backend/tests/holidays-architecture.test.ts`: una infracción representativa
debe hacer fallar la guarda y desaparecer después de retirarla. Afirmar que se
enumeró al menos un archivo del módulo y que las dependencias son detectadas.
