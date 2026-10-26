# Plan 077: atribución CPU de producción para Worker Portal

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Probar primero el agregador de `CPUProfile` con perfiles sintéticos: pesos
   de `timeDeltas`, pila de padres, mapeo de source maps y redacción de URL.
2. Compilar localmente con mapas y comprobar que cada JS generado, sin su
   comentario `sourceMappingURL`, coincide con el asset servido por staging.
3. Automatizar login worker por API, contextos sin caché/SW, throttling CPU 4×,
   navegación directa al staging, espera del reloj real y `Profiler.start/stop`
   por muestra.
4. Traducir call frames del staging a módulos originales, atribuir cada
   muestra al frame aplicativo más cercano y escribir solo agregados saneados.
5. En `finally`, reconstruir el `dist` normal; verificar que no queden mapas y
   que la imagen activa de staging no haya cambiado.
6. Analizar repetición entre las tres muestras, documentar límites y elegir el
   siguiente módulo solo si la atribución es consistente.

## Archivos a tocar

| Archivo                                               | Cambio                                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `frontend/package.json`                               | Comandos de build/profile aislados.                                                    |
| `frontend/scripts/profile-worker-production.mjs`      | Build local, sesiones CDP en staging, paridad de assets, mapeo, salida y restauración. |
| `frontend/scripts/profile-worker-production.test.mjs` | Pruebas del agregado, cobertura, rutas y privacidad.                                   |
| `specs/077-worker-portal-production-cpu-attribution/` | Criterios, plan, tareas y evidencia.                                                   |
| `.jules/bolt.md`                                      | Registrar el hallazgo y el siguiente foco con su límite.                               |

## Contratos afectados

Ninguno. No se modifican rutas HTTP, OpenAPI/SDK, Prisma, autenticación o datos.

## Riesgos y rollback

- El muestreador puede añadir overhead o producir pocas muestras; usarlo solo
  para localizar frames, repetir tres veces y declarar insuficiencia si las
  fuentes no resuelven.
- Una restauración incompleta dejaría `dist` con mapas; el proceso fuerza un
  build normal en `finally` y el gate verifica ausencia de `.map`.
- El bundle local y el staging podrían no corresponder; antes de perfilar se
  comparan los scripts por hash/path y contenido exacto, quitando solo la
  anotación del mapa local.
- La sesión consulta únicamente staging local y no ejecuta mutaciones.
- Si la atribución no es repetible, conservar el registro, descartar cualquier
  hipótesis de optimización y volver a la imagen estable sin tocar staging.

Rollback: quitar el perfilador y los scripts; no requiere revertir cambios de
runtime porque el objetivo no edita `frontend/src/`.

## Verificación

```bash
cd frontend
fnm exec --using=26.10.0 -- node --test scripts/profile-worker-production.test.mjs
fnm exec --using=26.10.0 -- npm run perf:profile:worker
fnm exec --using=26.10.0 -- npm run check:bootstrap-csp
cd ..
fnm exec --using=26.10.0 -- npm run spec:check
fnm exec --using=26.10.0 -- npm run docs:check
fnm exec --using=26.10.0 -- npm run preflight
git diff --check
```
