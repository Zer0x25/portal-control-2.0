# Plan 110: Alinear el Runtime Node 26.13.0

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Convertir `.nvmrc` en el pin exacto del runtime y fijar el mismo mínimo en los engines y lockfiles.
2. Hacer que los workflows de Node usen `node-version-file: .nvmrc` y que todos los Dockerfiles usen la misma etiqueta exacta.
3. Agregar un guard de configuración/runtime, ejecutarlo antes del arranque local y en CI.
4. Quitar del perfil de login el alias global Node 24 y hacer que el inicio de Bash active `.nvmrc` con fnm.
5. Registrar la decisión y aclarar la especificación histórica de Node 24.

## Archivos a tocar

| Archivo                                                                     | Cambio                                                    |
| --------------------------------------------------------------------------- | --------------------------------------------------------- |
| `.nvmrc`, `AGENTS.md`                                                       | Pin exacto y guía operativa                               |
| `package.json`, `backend/package.json`, `frontend/package.json` y lockfiles | Engines y comandos de comprobación                        |
| `backend/Dockerfile*`, `frontend/Dockerfile*`                               | Alinear tags de imágenes Node                             |
| `.github/workflows/{ci,deploy,performance}.yml`                             | Leer el pin desde `.nvmrc` y validar alineación           |
| `scripts/check-node-version.cjs`                                            | Validar runtime y detectar deriva de configuración        |
| `~/.profile`, `~/.bashrc`                                                   | Eliminar el alias global y activar el pin al iniciar Bash |
| `specs/001-node24-alignment/spec.md`, `docs/adr/0030-node-runtime-2613.md`  | Indicar vigencia y decisión actual                        |

## Contratos afectados

Ninguno. No cambian rutas, esquemas, SDK, migraciones ni datos.

## Riesgos y rollback

Los builds de Docker requieren acceso a la etiqueta exacta del runtime. El pin
no recibe parches automáticamente; se acepta actualizarlo de forma coordinada
en `.nvmrc`, engines, CI y Docker. El rollback es revertir este cambio y
restaurar el orden anterior del perfil de fnm.

## Verificación

Ejecutar `npm run check:node-version`, `npm run spec:check` y
`npm run docs:check`; abrir un shell de login en el repo y comprobar que
`node --version` devuelve la versión de `.nvmrc`. No requiere pruebas de
funcionalidad de la app.
