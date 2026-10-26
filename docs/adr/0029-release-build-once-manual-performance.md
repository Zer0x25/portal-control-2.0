# ADR-0029: Probar y publicar las mismas imágenes de release

- Estado: Aceptado
- Fecha: 2026-10-26
- Autores: zer0x

## Contexto

CI construía staging para Lighthouse después del build de validación. CD
construía staging para E2E y reconstruía imágenes para GHCR con distintos
argumentos del frontend. El usuario autorizó eliminar benchmarks automáticos
y probar los artefactos finales sin reconstrucción.

## Decisión

CI conserva validación, cobertura, build y presupuestos. No arranca staging ni
Lighthouse. CD construye backend, frontend y gateway una sola vez en un runner,
con caché GHA y configuración final. Registra sus IDs, levanta esas imágenes
con `compose.images.yaml` y `--no-build`, ejecuta funcionales y visuales, verifica
los IDs y publica únicamente si las pruebas pasan. El stack se fija por digest.

Las regresiones de arranque se conservan en el proyecto funcional con una visita
por caso. Las series de tiempos y diagnósticos quedan en `perf`, fuera de CD.
Los reportes de release se conservan siete días en éxito y fallo.

Lighthouse solo se ejecuta por `workflow_dispatch` con tres referencias GHCR
por digest. No construye, publica ni fija imágenes. Verifica las 17 rutas por
hash y conserva los umbrales existentes, reportes y resumen por siete días.
Un fallo del workflow manual no afecta la publicación de releases.

Esta decisión sustituye cualquier indicación anterior de ejecutar benchmarks en
CI o CD. Mantiene los ratchets de código, cobertura y bundle.

## Alternativas consideradas

- Construir y probar en jobs separados: requiere transferir las imágenes o
  publicar candidatos antes de validarlos; se elige un solo runner.
- Lighthouse por release o semanal: descartado por presupuesto de cómputo.

## Consecuencias

No hay construcción Docker en CI ni reconstrucción al publicar. El job de
release es secuencial. Un fallo de GHCR puede dejar imágenes parcialmente
subidas, pero el pineo requiere publicación completa. El checkout del harness
manual debe corresponder a una versión compatible con las imágenes elegidas.
La validez funcional se comprueba antes de publicar; las métricas de laboratorio
no certifican rendimiento de usuarios reales.

## Referencias

- [Spec 108](../../specs/108-release-build-once-manual-performance/spec.md)
- [CD](../../.github/workflows/deploy.yml)
- [Auditoría manual](../../.github/workflows/performance.yml)
