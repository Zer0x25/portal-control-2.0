# Plan 104: Diagnosticar tiempos CDP de requests de Control horario

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Agregar primero pruebas con secuencias sintéticas que fallen si el recolector
   no distingue la relación temporal inválida o publica una duración incorrecta.
2. Añadir un clasificador de motivos cerrado y sanitizado al perfilador; mantener
   intacto el criterio actual que omite duraciones inválidas.
3. Agregar los motivos al resumen por muestra y a la agregación por endpoint,
   sin emitir tiempos crudos, IDs, URLs ni headers.
4. Capturar tres navegaciones frías con el frontend activo de staging. Si persiste
   el desorden, documentar su distribución y elegir después un origen de tiempo
   alternativo; no ajustar el clasificador para hacer pasar medidas inválidas.
5. Restaurar el build normal, comprobar staging, ejecutar preflight y registrar
   límites y siguiente foco en evidencia y `.jules/bolt.md`.

## Archivos a tocar

| Archivo                                               | Cambio                                                      |
| ----------------------------------------------------- | ----------------------------------------------------------- |
| `frontend/scripts/profile-worker-production.mjs`      | Clasificar motivos temporales de forma segura y agregarlos. |
| `frontend/scripts/profile-worker-production.test.mjs` | Cubrir invariantes, motivos y privacidad.                   |
| `specs/104-time-control-request-timing-diagnostics/`  | Guardar criterio, método y tres perfiles saneados.          |
| `.jules/bolt.md`                                      | Registrar diagnóstico y próximo paso medido.                |

## Contratos afectados

Ninguno. No cambia el runtime, API, OpenAPI, SDK, almacenamiento ni base de
datos. Solo se amplía el formato del artefacto de diagnóstico local.

## Riesgos y rollback

- El nuevo resumen podría parecer una reparación de tiempos; mantener las
  duraciones nulas mientras cualquier invariante falle.
- Los IDs y timestamps de CDP se usan solo en memoria. Los artefactos publican
  categorías enum y recuentos agregados.
- Revertir las modificaciones al perfilador, sus tests y la evidencia; no hay
  migración ni cambio de runtime que revertir.

## Verificación

```bash
fnm exec --using=26.10.0 -- node --test frontend/scripts/profile-worker-production.test.mjs
fnm exec --using=26.10.0 -- node frontend/scripts/profile-worker-production.mjs --route=time-control --output=../specs/104-time-control-request-timing-diagnostics/evidencia/time-control-request-timing-2026-10-26.json
fnm exec --using=26.10.0 -- npm run spec:check
fnm exec --using=26.10.0 -- npm run docs:check
fnm exec --using=26.10.0 -- npm run preflight
git diff --check
```

## Resultado de ejecución

Los tres perfiles clasificaron 35/35 requests completados como
`response-after-completion`; los otros dos motivos no aparecieron. El resultado
no valida latencias y apunta a revisar el origen de respuesta y los campos de
`Network.Response.timing` en el siguiente diagnóstico. Ver
[`evidencia/resultado.md`](./evidencia/resultado.md).
