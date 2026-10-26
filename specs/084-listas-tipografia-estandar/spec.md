# Spec 084: Listas Tipografía Estándar

- Estado: Implementado
- Autor: @dev
- Fecha: 2026-10-25
- ADR relacionado: N/A

## Problema

Las vistas comparten tipografía general, pero cada tabla o lista define sus clases de forma independiente. `TimeRecordRow` y `ReportTable` muestran valores operativos con cursiva y tamaños compactos; el guardrail de `typographyGuardrails.test.ts` solo cubre el shell y no detecta esos desvíos. La regresión apareció en la lista de Reloj Control y también puede repetirse en tarjetas móviles, reportes y colas.

## Alcance

Dentro:

- Clasificar las listas en cuatro grupos: tablas de datos, tablas operativas virtualizadas, tarjetas de registros responsivas y feeds/colas.
- Definir roles tipográficos comunes: encabezado 12 px, texto principal 14 px, metadatos 12 px, valores numéricos/horarios 14 px monoespaciados y tabulares, y texto narrativo 14 px.
- Migrar los componentes listados en el inventario de tipografía y quitar cursiva decorativa de sus filas y valores.
- Agregar guardrails que validen el inventario, sus clases requeridas y la ausencia de `italic` en los componentes registrados.
- Ampliar las pruebas de `TimeRecordRow` y su tarjeta móvil para proteger nombre, estado y marcajes en ambas presentaciones.

Fuera (explícito):

- Cambiar tipografía de botones, modales o textos editoriales fuera de las listas registradas.
- Cambiar orden, densidad, paginación, datos, interacciones o comportamiento del backend.
- Actualizar snapshots visuales de Playwright, que tienen su ciclo de baseline separado.

## Criterios de aceptación

- [x] AC1: La guía del sistema define los cuatro grupos y la escala compartida; cada grupo conserva su jerarquía, densidad y estructura propias.
- [x] AC2: `index.css` ofrece utilidades semánticas para encabezados, contenido principal, metadatos, valores y notas de listas.
- [x] AC3: Los componentes del inventario usan las utilidades asociadas a su grupo y no aplican cursiva decorativa.
- [x] AC4: Un guardrail falla si se elimina una utilidad requerida, se agrega cursiva a una lista registrada, falta un archivo o se rompe una definición CSS canónica.
- [x] AC5: Las pruebas de filas de escritorio/virtualizadas y tarjetas móviles comprueban que nombre, estado y marcajes conservan sus roles legibles y no cursivos.

## Restricciones

- Respetar los tokens semánticos claro/oscuro existentes.
- Los IDs, fechas, horas y cantidades usan `font-mono tabular-nums`; no comprimir el ancho con `tracking-tighter`.
- La escala de listas tiene mínimo 12 px para encabezados/metadatos y 14 px para contenido principal y valores.
- No editar los snapshots visuales en esta especificación.

## Trazabilidad

- Tests que lo probarán: `frontend/src/tests/guardrails/listTypographyGuardrails.test.ts`, `frontend/src/tests/components/time_control/TimeRecordRow.spec.tsx` y `frontend/e2e/gap-coverage.spec.ts` para estilos calculados de escritorio contra staging.
- Docs a actualizar: `.agents/rules/design-system-governance.md` y el inventario de componentes en `frontend/src/tests/guardrails/list-typography-groups.json`.
