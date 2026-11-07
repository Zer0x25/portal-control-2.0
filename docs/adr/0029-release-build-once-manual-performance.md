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

## Actualización: reintentos de release (2026-11-06)

El [fallo de release #238](https://github.com/Zer0x25/portal-control-2.0/actions/runs/42324188376)
mostró que un error E2E obligaba a repetir la construcción completa. Se separan
`build`, `release` (validar/publicar) y `pin-stack-images`. Build exporta las tres
imágenes con su manifiesto a un artefacto inmutable de la ejecución, retenido
tres días. Los jobs posteriores descargan por ID, incluso si pertenecen a un
intento previo; las etiquetas locales usan run ID y no run attempt.

La validación hace checkout del SHA construido y comprueba propietario, SHA,
etiquetas e IDs antes de arrancar y antes de publicar. Los reportes funcionales
y visuales usan directorios distintos. La regresión visual conserva su carácter
diagnóstico no bloqueante; la validación funcional sigue impidiendo publicación
y pineo cuando falla. Cada intento guarda sus reportes durante siete días.

Para un fallo transitorio, usar **Re-run failed jobs** en la ejecución original:
el build exitoso no se repite. Si solo falló el pineo, se reutiliza el manifiesto
publicado por ID y tampoco se repiten las pruebas. Después de expirar candidatos,
se necesita una ejecución completa nueva. Esta transferencia añade tráfico y
almacenamiento entre runners a cambio de evitar recompilar en reintentos.

Un fallo de producto o test que requiere cambiar código se resuelve por PR y
una nueva versión correctiva. Reintentar una ejecución antigua conserva su
workflow y código; no recoge arreglos nuevos. No se mueve el tag v8.38.0 ni se
republica esa versión con código diferente.

CI detecta rutas solo en PR y valida cambios de bots y dependencias como los de
cualquier autor. Release Please serializa la edición de sus PR; cada job declara
los permisos de escritura que utiliza. Actionlint, fijado por versión y SHA256,
valida los workflows en gates. No se relajan cobertura, lint ni presupuestos.

- [Spec 111](../../specs/111-release-retry-workflow/spec.md)
