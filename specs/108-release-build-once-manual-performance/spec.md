# Spec 108: imágenes de release probadas una sola vez y rendimiento manual

- Estado: Implementado; pendiente primera ejecución en GitHub
- Autor: zer0x
- Fecha: 2026-10-26
- ADR relacionado: `docs/adr/0029-release-build-once-manual-performance.md`

## Problema

CI compila el frontend y vuelve a construir todo staging para Lighthouse.
CD construye staging para E2E y reconstruye las imágenes al publicar, con
argumentos de build distintos. Los artefactos publicados no son los probados.
El usuario autorizó retirar benchmarks automáticos y reutilizar imágenes de CD.

## Alcance

CI conserva validación, cobertura, build y presupuestos. CD construye las tres
imágenes una vez, prueba esas imágenes y solo entonces publica y fija digests.
Las regresiones de arranque pasan a funcionales; los diagnósticos y las series
de tiempos quedan manuales. Un workflow manual acepta tres digests publicados,
arranca staging aislado sin build y entrega Lighthouse por ruta e informes.
Sin cambios de runtime, datos de negocio, ratchets ni despliegue externo real.

## Criterios de aceptación

- [x] AC1: CI no construye staging ni ejecuta Lighthouse; conserva validaciones, cobertura, build y presupuestos.
- [x] AC2: CD construye cada imagen una vez, con configuración final, carga las imágenes locales y ejecuta pruebas funcionales y visuales antes de cualquier push.
- [x] AC3: Un fallo de pruebas impide publicación y pineo. La publicación verifica los IDs de las imágenes probadas y el pineo usa los digests resultantes y el commit realmente construido.
- [x] AC4: Las regresiones funcionales de arranque, carga diferida, consultas y overlays siguen bloqueando CD con una visita por caso; los benchmarks y perfiles no se ejecutan automáticamente.
- [x] AC5: Rendimiento solo se dispara manualmente con digests válidos, usa staging aislado con build eliminado y --no-build, conserva umbrales por ruta y genera reportes y resumen sin publicar ni pinear imágenes.
- [x] AC6: CD guarda reportes en éxito y fallo, identifica las imágenes probadas/publicadas, limpia volúmenes y documenta uso y límites. Los tests de herramientas, parser de workflows, Compose, tipado frontend y checks de documentación pasan; se registra que falta la primera ejecución en GitHub.
