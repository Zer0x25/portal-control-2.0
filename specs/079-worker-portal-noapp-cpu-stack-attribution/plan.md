# Plan 079: atribuir CPU de Worker Portal fuera de frames de la app

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Clasificar cada frame hoja de las muestras sin frame `src/` como módulo
   mapeado, bundle no mapeado, o frame nativo/desconocido; agregar el frame
   fuente mapeado más cercano de la pila como caller probable.
2. Agregar una prueba sintética con un caller React DOM mapeado y una hoja
   nativa sin URL para fijar atribución, conteo y categorías sin duplicación.
3. Ejecutar tres capturas frías con el mismo runner y staging activo, sin
   reconstruir contenedores; exigir paridad de bundles e identidad de imagen.
4. Revisar los callers repetidos y registrar el candidato de optimización o
   explicar por qué la evidencia aún no distingue una causa accionable.
5. Restaurar build local normal, validar gobernanza y guardar reporte/Bolt
   Journal antes del commit.

## Archivos a tocar

| Archivo                                                | Cambio                                                                            |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `frontend/scripts/profile-worker-production.mjs`       | Categorías de hoja/caller, medianas y salida por defecto en Spec 079.             |
| `frontend/scripts/profile-worker-production.test.mjs`  | Cobertura de frame hoja desconocido y caller mapeado, agregación sin duplicación. |
| `specs/079-worker-portal-noapp-cpu-stack-attribution/` | Spec, plan, tareas y evidencia del perfil.                                        |
| `.jules/bolt.md`                                       | Resultado y límite de la atribución.                                              |

## Contratos afectados

Ninguno. No cambian rutas HTTP, schemas, Prisma, OpenAPI/SDK ni el runtime de
frontend. El JSON de diagnóstico avanza a `schemaVersion: 2`.

## Riesgos y rollback

- Un frame nativo sin URL no identifica por sí solo qué API del navegador lo
  llamó; por eso se conserva aparte del caller JavaScript y no se presenta como
  causalidad definitiva.
- La pila mapeada puede tener llamadas anónimas; se registra el frame fuente
  mapeado más cercano y se limita una recomendación a callers observados en al
  menos dos contextos.
- Si falla la paridad o el perfil, no se modifican los servicios activos; se
  restaura `frontend/dist` con `npm run build` (el runner también lo hace en
  `finally`) y se conserva el error sin declarar un hallazgo.
- Si cambia la forma del JSON, revertir el cambio del perfilador y las pruebas;
  no requiere rollback de aplicación o datos.

## Verificación

```bash
cd frontend
fnm exec --using=26.10.0 -- npm run test:profile:worker
fnm exec --using=26.10.0 -- npm run check
fnm exec --using=26.10.0 -- npm run lint
cd ..
npm run spec:check
npm run docs:check
npm run lint:budget
node .agents/skills/ci-preflight/scripts/preflight.cjs
git diff --check
```
