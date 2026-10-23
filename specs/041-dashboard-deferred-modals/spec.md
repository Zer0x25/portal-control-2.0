# Spec 041: Modales secundarios de Dashboard bajo demanda

Estado: Implementado
Fecha: 2026-10-23

## Problema

Tras spec 040, Dashboard frío sigue con LCP mediano simulado de 6.22 s. Un perfil CDP sobre el bundle real, CPU x4 y contexto nuevo, muestra carga inicial de QuickNotes (formulario incluso cerrado), ShiftReportModal y exportToPdf. El chunk vendor pesa 57 KB transferidos y mezcla Query con dependencias de formularios y sanitización; Lighthouse identifica unos 44 KB de vendor sin ejecutar en la carga inicial. El perfil atribuye 399 ms de muestras propias a React y 134 ms a estado, sin un único componente dominante: no justifica memoización manual ni atribuir todo ese tiempo a los modales.

## Alcance

Diferir notas y visor de reportes desde Dashboard, aislar sus dependencias del vendor de arranque, conservar el estado de notas tras cerrar/reabrir y guardar evidencia antes/después. Sin cambios visuales, contratos HTTP, roles, reloj, sincronización ni persistencia. No cambiar el precache general ni optimizar useScheduling en esta iteración.

## Criterios de aceptación

- [x] AC1: El documento de Dashboard no solicita al cargar QuickNotesModal.container, ShiftReportModal ni exportToPdf; los importa al abrir la función correspondiente.
- [x] AC2: Notas conserva texto/color sin enviar entre cierre y reapertura; las validaciones, foco y salida por Escape siguen operando.
- [x] AC3: El visor mantiene datos de reporte y acción de impresión; ninguna exportación se ejecuta al cargar Dashboard.
- [x] AC4: Formularios y sanitización tienen chunks independientes del vendor necesario en el arranque, con menor JavaScript inicial medido y presupuestos intactos.
- [x] AC5: Staging reconstruido pasa regresiones enfocadas y batería de 18 rutas, 17 Lighthouse y 3 Dashboard fríos; comparación registra imagen, versión, muestras y límites causales.
- [x] AC6: Tipos, lint 0/0, formato, guards de capas, specs y enlaces pasan; documentación identifica próximos cuellos medidos.
