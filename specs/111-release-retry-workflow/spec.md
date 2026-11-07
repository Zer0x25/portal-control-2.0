# Spec 111: corregir release #238 y evitar reconstrucciones en reintentos

- Estado: Implementado y validado localmente; pendiente CD tras merge
- Fecha: 2026-11-06
- ADR relacionado: [ADR-0029](../../docs/adr/0029-release-build-once-manual-performance.md)

## Problema y evidencia

[Release Please #238](https://github.com/Zer0x25/portal-control-2.0/actions/runs/42324188376)
creó v8.38.0 pero falló en `business-flows.spec.ts`: la ruta heredada ahora
redirige a Gestión de Personal y el título anterior ya no existe. Además, el
modo embebido oculta el botón de alta en escritorio. El grupo serial dejó ocho
pruebas sin ejecutar. Reintentar el job reconstruye todas las imágenes.

## Alcance

Restaurar el alta embebida, comprobar filtros y modal con localizadores
semánticos, aislar casos independientes y conservar candidatos Docker entre
jobs de la misma ejecución. Mejorar detección de cambios, permisos y reportes.
No modificar API, SDK, datos de producción, umbrales ni tags existentes.

## Criterios de aceptación

- [x] AC1: La ruta heredada redirige a Personal/Empleados; buscar filtra resultados y el alta funciona en escritorio con un único encabezado de página.
- [x] AC2: Los casos de negocio independientes no se omiten por el fallo de un caso vecino ni repiten pausas fijas para detectar disponibilidad.
- [x] AC3: Reintentar solo jobs fallidos reutiliza el archivo de imágenes y manifiesto del build exitoso; se verifican IDs antes de probar y publicar.
- [x] AC4: Ninguna imagen se publica o fija si falla la validación funcional; los reportes funcionales y visuales tienen destinos separados.
- [x] AC5: La detección de cambios solo corre en PR; bots y dependencias reciben validación por rutas, sin excepciones por actor. Los permisos de escritura se limitan a los jobs que los necesitan.
- [x] AC6: Preflight, regresiones pertinentes, comprobación de workflows y documentación pasan; se registran las limitaciones de validación local y cómo recuperar una release fallida.
