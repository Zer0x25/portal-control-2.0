# Spec 121: Semántica de paneles

- Estado: Implementado
- Fecha: 2026-11-21
- ADR relacionado: `docs/adr/0032-semantica-paneles.md`

## Problema

Los paneles usan contenedores genéricos para la colección de widgets y la navegación de supervisión. El estado seleccionado de esta última solo se expresa visualmente. El shell ya proporciona un `main`.

## Alcance

Dentro: estructura de los dos paneles, estado accesible de navegación y criterio transversal. Fuera: rediseño visual, cambios de API y migración masiva de otras páginas.

## Criterios de aceptación

- [x] AC1: Los widgets se exponen como una lista y el estado de carga se anuncia.
- [x] AC2: La navegación de supervisión tiene nombre accesible y sus botones comunican el estado seleccionado.
- [x] AC4: Los títulos y controles del contenido principal del piloto tienen semántica adecuada y soportan teclado.
- [x] AC3: El criterio transversal queda documentado y las pruebas verifican los contratos semánticos.

- [x] AC5: El expediente es un diálogo nombrado que atrapa el foco, cierra con Escape y devuelve el foco al origen.

- [x] AC6: Los dos diálogos piloto comparten gestión de foco, Escape y fondo inerte; diálogos apilados restauran el estado previo.

## Restricciones

Conservar estilos, interacción, shell y compatibilidad; revertir los cambios de vista y pruebas si fuera necesario.
