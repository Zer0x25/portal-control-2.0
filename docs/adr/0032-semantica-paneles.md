# ADR-0032: Semántica de páginas y paneles

- Estado: Propuesto
- Fecha: 2026-11-21
- Autores: equipo de portal-control

## Contexto

El shell en `frontend/src/components/layout/PersistentLayout.view.tsx` ya ofrece el landmark `main`. Los paneles contienen estructuras de presentación, una colección de widgets y controles que cambian la vista; no todo `div` es un problema. En supervisión el estado activo era exclusivamente visual.

## Decisión

Usar un solo `main` por página, proporcionado por el shell. Mantener un `h1` identificable y una jerarquía coherente; usar `nav` con nombre para grupos de navegación, `ul`/`li` para colecciones, `section` con nombre para regiones que aporten orientación y `article` solo para contenido autónomo. Conservar `div` para agrupación y estilos cuando no exista un significado más preciso. No crear landmarks redundantes ni regiones sin nombre.

Preferir controles HTML nativos. Comunicar el estado de botones de selección con `aria-pressed`; adoptar el patrón ARIA de pestañas únicamente si se implementan también sus relaciones, foco y navegación por teclado. Anunciar estados de carga relevantes mediante `role="status"`. Verificar nombres, estructura, teclado y diseño en móvil y escritorio cuando sea posible.

Los diálogos modales deben tener nombre accesible, foco inicial y contención del foco, fondo inerte, cierre con Escape y restauración del foco. La base compartida `useModalAccessibility` implementa este contrato en `CinematicModal` y el expediente de empleado, incluyendo diálogos apilados y restauración de estados inertes previos. Para excepciones como flujos obligatorios, documentar y probar el comportamiento específico antes de su adopción; no omitir una salida accesible. Los diálogos existentes se migran gradualmente y el guardrail vigente controla los overlays propios.

## Alternativas consideradas

1. Sustituir todos los `div` por `section` o `article`: descartada porque crea semántica engañosa y ruido en la navegación asistida.
2. Usar roles de pestañas sin comportamiento completo de teclado: descartada porque promete una interacción no implementada.

## Consecuencias

Se mejora la orientación y se proporciona un criterio gradual aplicable a nuevas vistas y cambios existentes. Cada adopción requiere revisar contenido, estilos y accesibilidad; no implica reescritura automática del resto de la aplicación.

## Referencias

- [Spec 121](../../specs/121-semantica-paneles/spec.md).
- [Dashboard](../../frontend/src/features/dashboard/views/Dashboard.view.tsx).
- [Supervisión](../../frontend/src/features/supervisor-dashboard/views/SupervisorDashboard.view.tsx).
