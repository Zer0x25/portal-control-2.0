# ADR-0013: CI completa en PR y solo gates en main

- Estado: Aceptado
- Fecha: 2026-10-02
- Autores: zer0x
- Spec:related: ADR-0012 (gates de gobernanza)

## Contexto

`ci.yml` corria los mismos 7 jobs para dos eventos: `pull_request` y
`push` a `main`. Post-merge eso significa ejecutar la bateria pesada
(`verify-backend`, `verify-frontend`, `coverage-ratchet`, `e2e-smoke`)
sobre un codigo que el PR recien habia validado.

Medido sobre la corrida `37035567451` (main, verde, 2026-10-02):

| Job             | Duracion |
| --------------- | -------: |
| E2E Smoke       |    176 s |
| Coverage        |    193 s |
| Verify frontend |    198 s |
| Verify backend  |     84 s |

Las 4 etapas 1 suman 737 runner-segundos (12.3 runner-min) que
reportan exactamente el mismo codigo que los check-runs del PR ya
habian validado sobre el _merge ref_. El unico trabajo nuevo era
confirmar que el squash commit en main tiene contenido identico al del
PR, lo que GitHub garantiza por construccion.

Restricciones:

- `deploy.yml` exige `conclusion == 'success'` y `head_branch == 'main'`,
  asi que el CD depende de una corrida real de CI sobre main.
- El repositorio es privado en plan gratis: la API de branch
  protection responde `403` ("Upgrade to GitHub Pro"). No existe
  required check que haga obligatorio esperar el CI del PR.
- El hook `pre-push` ya ejecuta `validate:ci` de ambos paquetes antes de
  dejar salir cualquier commit.

## Decisión

Repartir la validación por evento en lugar de repetirla:

- `pull_request`: los 3 gates rapidos **y** los 4 jobs pesados.
- `push` a `main`: **solo** los 3 gates rapidos (agentic, spec, docs),
  ~25 s de runner en total.

La barrera del CD no se relaja: `deploy.yml` sigue bloqueado por una
corrida de CI real sobre main, solo que esa corrida ahora valida
gobernanza en lugar de repetir la bateria funcional. Para pushes
directos a main que no pasan por PR, el hook `pre-push` cubre la
bateria pesada en la maquina del autor.

`cancel-in-progress` vuelve a `true` sin condiciones. La corrida
condicional anterior (desactivar cancelacion en main) existia para
proteger la etapa 1 de ser cancelada; con main reducido a 3 gates de
~8 s cada uno, cancelar una corrida en curso cuesta ~0.4 runner-min y
el codigo mas nuevo invalida al anterior.

## Alternativas consideradas

1. CD disparado por `pull_request: closed` reutilizando el veredicto
   del PR — descartada: el squash cambia el SHA (`head=3443c34` vs
   `merge_commit=02d3f0b` en PR #38), ademas `refs/pull/N/merge` se
   elimina al mergear, y el CI del PR no se re-lanza cuando `main`
   avanza, asi que no se puede probar que el commit mergeado siga
   correspondiendo a una validacion. Exige un gate propio con la API
   de check-runs y un fallback a CI completo para cuando la
   correspondencia falle: mas complejidad que el ahorro.
2. Mantener CI completa en main y eliminar el `push` — descartada:
   `deploy.yml` depende de `workflow_run` con `head_branch == 'main'`,
   asi que sin el trigger no hay barrera previa al deploy.
3. Correr la bateria pesada en main solo cuando el commit no viene de
   un PR — descartada: requiere resolver en el workflow si el commit
   tiene PR asociado (API GraphQL), y el `pre-push` ya cubre ese
   caso sin consumir minutos de GitHub.
4. Serializar la bateria pesada (verify → coverage → e2e) — ya
   descartada en el fail-fast de 2 etapas: costaba +73 s en cada PR
   verde para ahorrar tiempo solo cuando fallaba un job pesado.

## Consecuencias

Positivas:

- ~12 runner-min ahorrados por merge en main. Un PR sigue validando
  7/7 jobs; main pasa a 3/3.
- El CD conserva una barrera real: solo publica si los gates de main
  pasan.
- `cancel-in-progress` simple y correcto en ambos contextos.

Negativas / costos aceptados:

- `main` ya no ejecuta `verify-*`, `coverage-ratchet` ni `e2e-smoke`.
  La garantia pasa a ser: "el PR valido la bateria pesada y main
  valida gobernanza". Si alguien mergea con `--admin` un PR con CI
  rojo, el CD publicaria igual, porque los gates de main no detectan
  un frontend roto.
- Sin branch protection (plan gratis), el CI del PR es informativo:
  nadie esta obligado a esperar los 7 checks antes de mergear.
- Un PR aprobado con main moviendose despues puede mergearse sobre una
  base distinta a la que valido su CI. GitHub no re-lanza el CI del PR
  en ese caso, y antes este diseño al menos lo cubria post-merge.

## Referencias

- `.github/workflows/ci.yml` — gatillo por evento y condiciones `if`.
- `.github/workflows/deploy.yml` — barrera `conclusion == 'success'` +
  `head_branch == 'main'`.
- `.husky/pre-push` — `validate:ci` de ambos paquetes para pushes
  directos a main.
- `docs/adr/0012-rock-solid-governance.md` — gates de cobertura, e2e y
  docs que se conservan intactos.
