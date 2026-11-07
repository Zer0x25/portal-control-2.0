# ADR-0030: Fijar el runtime de aplicación en Node 26.13.0

- Estado: Propuesto
- Fecha: 2026-11-03
- Autores: zer0x

## Contexto

`.nvmrc` y los paquetes ya habían migrado a Node 26, pero las imágenes de
desarrollo seguían en Node 24 (`backend/Dockerfile.dev:1`,
`frontend/Dockerfile.dev:1`) y `frontend/Dockerfile.prod:1` también conservaba
Node 24. Los workflows y las imágenes principales usaban `26` sin fijar el
parche. En la máquina local, `~/.profile` anteponía `fnm/aliases/default/bin`,
por lo que `node -v` resolvía 24.21.0 aunque FNM detectaba 26.10.0 desde
`.nvmrc`. Los engines no frenaban el arranque porque `engine-strict` estaba
desactivado.

Node 26.13.0 pasó a LTS el 2026-10-28. Se elige ese parche como pin compartido
para que el runtime de la aplicación sea idéntico en el host, CI e imágenes.

## Decisión

`.nvmrc` será la fuente de verdad y fijará `26.13.0`. Los workflows usarán
`node-version-file: .nvmrc`; todas las imágenes basadas en Node usarán
`node:26.13.0-alpine`. Los engines declararán `>=26.13.0 <27` y los lockfiles
se mantendrán sincronizados.

`npm run check:node-version` verificará el runtime efectivo y que engines,
lockfiles, workflows y Dockerfiles coincidan. Se ejecutará antes de `npm run
dev` y en CI. Bash eliminará el alias global del `PATH` e invocará `fnm use`
al iniciar para activar el pin del repo.

El runtime Node 24 de las acciones JavaScript de GitHub sigue separado. GitHub
lo administra en el runner y no es el runtime de npm, backend ni frontend.

## Alternativas consideradas

1. Mantener etiquetas flotantes `26` — descartada porque una instalación local
   puede resolver un parche distinto al de CI y Docker.
2. Volver a Node 24 — descartada porque Spec 007 ya eligió Node 26 y Node 26.13.0
   ya está en LTS.

## Consecuencias

Positivas:

- El host, CI, desarrollo y builds de producción comparten el mismo runtime.
- El guard corta el arranque con un error claro si vuelve a aparecer deriva.

Negativas / costos aceptados:

- Los parches de Node deben actualizarse juntos y requieren regenerar las
  imágenes; el pin no avanza automáticamente.

## Referencias

- `.nvmrc`, workflows, Dockerfiles y `scripts/check-node-version.cjs` — pin y guard.
- `specs/110-node-runtime-2613/spec.md` — alcance y criterios de aceptación.
- `specs/007-stack-node26-fastify/spec.md` — decisión previa de usar Node 26.
- `https://nodejs.org/en/blog/release/v26.13.0` — promoción a LTS de Node 26.13.0.
