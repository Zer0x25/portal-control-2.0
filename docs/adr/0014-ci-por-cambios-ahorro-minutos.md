# ADR-0014: CI por cambios para reducir minutos de GitHub

- Estado: Propuesto
- Fecha: 2026-10-02
- Autores: zer0x
- Spec:related: ADR-0013 (reparto PR/main), ADR-0012 (gobernanza)

## Contexto

ADR-0013 midio la corrida `37035567451` (main, verde, 2026-10-02):

| Job             | Duracion |
| --------------- | -------: |
| E2E Smoke       |    176 s |
| Coverage        |    193 s |
| Verify frontend |    198 s |
| Verify backend  |     84 s |

Todo PR pagaba los 4 jobs (~651 s) aunque solo tocara una area, mas 3
gates en jobs separados (3 checkouts, 3 esperas en cola). Casos de
desperdicio confirmados en `.github/workflows/ci.yml`:

1. `coverage-ratchet` reinstalaba ambos paquetes (`npm ci` backend +
   `npm ci` frontend) y re-corria la suite de frontend que
   `verify-frontend` ya habia corrido dentro de `validate:ci`.
2. `e2e-smoke` corria en paralelo a los verifys: en un PR rojo quemaba
   ~176 s (build de `compose.dev` + Playwright) sobre codigo roto.
3. PRs de release-please (bumps de version + changelogs) y PRs solo-docs
   corrian la bateria completa (~11 min) sin codigo funcional nuevo.
4. `publish-images` (`deploy.yml`) reconstruia las 3 imagenes desde cero
   en cada merge, repitiendo los `npm ci` de los Dockerfiles.
5. El `sed` de pineo tenia el owner `zer0x25` hardcodeado: en clones o
   forks no matchea y el pineo se salta en silencio.

## Decisión

1. Job `changes` (`dorny/paths-filter@v3`, ~15 s, sin `npm ci`) que
   clasifica el PR en `backend/`, `frontend/` y `stack` (compose,
   Dockerfiles, nginx, e2e). Los jobs pesados solo corren si su area
   cambio.
2. Gates fusionados en un unico job `gates` (secret scan + guardrails +
   `spec:check` + `docs:check` + Prettier): un checkout, una espera en
   cola. El Prettier remoto (`npx --yes prettier@3.8.1`) usa cache de
   `~/.npm` entre corridas.
3. Cobertura dentro de los verifys, sin job separado: `verify-backend`
   anade `npm run test:coverage` (su `validate:ci` solo corre el subset
   de schemas, no hay doble ejecucion) y `verify-frontend` usa el nuevo
   script `validate:ci:coverage` (igual a `validate:ci` pero con
   `test:coverage` en vez de `test:run:ci`). Los thresholds de
   `backend/vitest.config.ts` y `frontend/vite.config.ts` siguen siendo
   el ratchet: solo suben.
4. `e2e-smoke` pasa a `needs: [verify-backend, verify-frontend]` y solo
   corre si los verifys quedaron en `success` o `skipped` (area sin
   cambios). Descarga de navegadores Playwright cacheada; espera de
   health reducida de ~10 min a ~3 min; `timeout-minutes: 25`.
5. Los PRs de release-please (`head.ref` con prefijo `release-please--`)
   solo corren `changes` + `gates` (~40 s).
6. Dependabot desactivado: se elimina `.github/dependabot.yml` (sus 5
   entradas semanales generaban hasta 25 PRs, cada uno con CI completo)
   y los jobs pesados excluyen ramas `dependabot/`. Las dependencias se
   actualizan manualmente con `npm outdated` + `npm update` por paquete,
   validando con `npm run validate:ci` local (el hook `pre-push` lo exige
   en pushes a main, solo para los paquetes tocados).
7. `npm ci --no-audit --no-fund` en CI y `timeout-minutes` en todos los
   jobs pesados (15 verifys, 25 e2e, 30 publish, 5 pineo).
8. Deploy con cache GHA por imagen (`cache-from/to type=gha` con scope
   de la matriz + `setup-buildx`): los merges que no tocan dependencias
   reutilizan las capas de `npm ci`. Deploys encolados (`concurrency:
deploy-main`, sin cancelacion) para no correr sobre `compose.yaml`.
9. `pin-stack-images` usa `${{ github.repository_owner }}` en el patron
   del `sed` en vez del owner hardcodeado.
10. Hooks locales optimizados (Husky se conserva): `pre-commit` usa
    `lint-staged` (solo archivos stageados, misma paridad que
    `format:check`/`lint` por paquete) y `pre-push` solo valida cuando
    el push toca `main`, corriendo los gates más el `validate:ci` de
    los paquetes tocados (`scripts/pre-push.cjs`). Pushes a ramas
    feature no validan nada local: las cubre el CI del PR.

## Alternativas consideradas

1. Cadena total verify -> coverage -> e2e — descartada: ya se midio en
   el diseno anterior que serializar cuesta ~+73 s de wall clock en cada
   PR verde; el ahorro solo aparece en PRs rojos, que ahora se cubren
   con el gate de verifys sobre e2e sin penalizar los verdes.
2. `test:coverage` dentro del `validate:ci` local — descartada: el
   hook `pre-push` y el flujo local deben seguir rapidos sin el overhead
   de cobertura; por eso existe `validate:ci:coverage` solo para CI.
3. Cachear `node_modules` entre jobs con artefactos — descartada:
   `setup-node` con cache de npm + `--no-audit --no-fund` ya recorta la
   instalacion sin el costo de subir/bajar ~500 MB por corrida.
4. e2e solo en main — descartada: el smoke valida el stack integrado
   antes del merge; con el gate de verifys su costo en PRs rojos ya
   desaparece y en verdes sigue aportando senal.

## Consecuencias

Positivas:

- PR verde completo: ~651 s -> ~400 s (gates fusionados, sin job de
  cobertura duplicado, installs mas rapidas). PRs de release-please o
  solo-docs: ~11 min -> ~40 s.
- PR rojo: el e2e ya no quema ~176 s; el fallo se reporta en el verify.
- Deploy incremental: merges sin cambios de dependencias reconstruyen
  casi gratis; pineo portable a clones/forks.

Negativas / costos aceptados:

- Los jobs `agentic-guardrails`, `spec-check`, `docs-check` y
  `coverage-ratchet` dejan de existir como checks separados; pasan a
  ser pasos de `gates` o de los verifys. No hay branch protection en
  este repo (plan gratis, ver ADR-0013), asi que ningun ajuste de
  required checks es necesario; si se activa proteccion en el futuro,
  exigir `Gates`, `Verify backend`, `Verify frontend` y `E2E Smoke`.
- `dorny/paths-filter@v3` es una dependencia externa nueva del CI. Si
  la accion falla, todos los pesados se saltean por diseño fail-closed
  de los `outputs` vacios: un PR verde mostraria solo `changes` +
  `gates`. El riesgo se mitiga porque el `pre-push` local a main sigue
  corriendo `validate:ci` de los paquetes tocados.
- Un cambio solo en `scripts/` dispara ambos verifys (filtro grueso
  deliberado: `lint-budget.cjs` afecta a los dos paquetes).

## Referencias

- `.github/workflows/ci.yml` — jobs `changes`, `gates`,
  `verify-backend`, `verify-frontend`, `e2e-smoke`.
- `.github/workflows/deploy.yml` — cache GHA por imagen, concurrencia
  `deploy-main`, patron de pineo con `github.repository_owner`.
- `frontend/package.json` — script `validate:ci:coverage` (solo CI).
- `backend/vitest.config.ts`, `frontend/vite.config.ts` — thresholds
  del ratchet de cobertura.
- `docs/adr/0013-ci-pr-full-deploy-main-gates.md` — mediciones base.
