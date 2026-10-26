# E2E y navegación headless (staging)

Base: `http://127.0.0.1:8080` (gateway del stack `compose.staging.yaml`).
Login API: `POST /api/auth/login` (`admin` / `999.666`, worker `juan.perez` / `123456`).

## Regla HashRouter (obligatoria para agentes)

La app usa `HashRouter` (`src/contexts/AppProviders.tsx`). **Nunca** navegar a paths
planos: `page.goto("/dashboard")` NO navega (el gateway sirve `index.html` y el
router conserva el hash anterior). Siempre con hash:

```ts
await page.goto("/#/dashboard");
await page.goto("/#/configuration?tab=email");
```

## Sesión rápida (helper `helpers/auth-helper.ts`)

`loginFast(page, request, "admin" | "worker")` siembra `sessionStorage`
(`authToken` + `currentUser`) antes de navegar. Preferirlo sobre login UI,
salvo que se pruebe el login mismo (`[data-testid="login-form"]`).

## Contrato DOM para agentes

- Shell: `[data-testid="app-shell"][data-current-path]`, `skip-to-content`,
  `app-header`, `app-sidebar`, `main-navigation`, `main-content`.
- Sidebar: `[data-testid="nav-item-<slug>"]` (`slug` = ruta con `/` → `-`;
  ej. `nav-item-planning-monthly`), `[data-nav-active="true"]` marca el activo,
  `[data-testid="nav-badge-<slug>"]` marca Beta.
- Tabs con query: `[data-testid="config-tabs"][data-active-tab]`,
  `config-tab-<id>` (`variables|email|master-data`);
  `[data-testid="governance-tabs"][data-active-tab]`,
  `governance-tab-<id>` (`integrity|security|audit|system|health`).
  `data-current-path` NO incluye el query: distinguir tabs por `data-active-tab`.
- Login: `login-page`, `login-form` (`#username`, `#password`), `login-submit`,
  `login-kiosk-link`.
- 404 autenticado: `not-found-page`, `not-found-home-button`, `not-found-back-button`
  (conserva el shell; anónimos van al login).
- Rutas huérfanas resueltas: `/meter-readings`, `/communications` y
  `/personnel-management` ya tienen item de sidebar
  (`nav-item-meter-readings`, `nav-item-communications`,
  `nav-item-personnel-management`) según rol.
- Contenido: `page-heading` (vía `PageHeader`), `data-table` (grillas),
  `empty-state` (vacío compartido e inline).
- Paginación: `pagination[data-page][data-total-pages]`,
  `pagination-first|prev|next|last` (solo cuando hay >1 página).
- Accesibilidad (axe-core, core+serious): login, dashboard, planificador
  (calendario de turnos) y worker-portal, en tema claro y oscuro.
- Modales: `modal-dialog` genérico (con `role="dialog"` + `aria-labelledby`);
  MFA con `mfa-login-modal`/`mfa-login-form` y `mfa-setup-modal`/`mfa-setup-form`.
- Kiosco (`/#/kiosk`): fuera del shell (sin `app-shell`/`main-content`);
  `page-container`, `kiosk-step[data-step]`
  (`rut_input|employee_list|pin_input|actions|success|change_pin`), `kiosk-display`,
  `kiosk-keypad`, `kiosk-key-<1..9,K,0>`, `kiosk-key-delete`, `kiosk-key-confirm`,
  `kiosk-exit-button`, `kiosk-rut-error`, `kiosk-pin-error`.

## Regresión visual (spec 035, AC4)

Suite curada de 6 rutas (`visual-targets.ts` es el **único** fichero que
declara el conjunto), en tema claro y oscuro. Vive en el proyecto `visual` de
`playwright.config.ts` y corre **después** de los funcionales y **antes** de
`perf`.

```bash
# Ejecutar la suite visual contra el staging (el proyecto `visual` arrastra
# la dependencia `functional`, así que corre todo el e2e):
E2E_BASE_URL=http://127.0.0.1:8080 E2E_API_URL=http://127.0.0.1:8080/api \
  npx playwright test --project visual

# Solo el spec visual, sin arrastrar los funcionales:
E2E_BASE_URL=http://127.0.0.1:8080 E2E_API_URL=http://127.0.0.1:8080/api \
  npx playwright test --project visual --no-deps
```

### Baselines: operación explícita y separada

Los baselines versionados están en
`frontend/e2e/visual-regression.spec.ts-snapshots/`. **Actualizarlos nunca
ocurre dentro de un PR de código**: es un PR dedicado, solo con los PNG, cuyo
diff de imágenes _es_ la revisión.

```bash
# 1) Rebuild del staging con el código candidato
docker compose --env-file .env.staging -f compose.staging.yaml up --build -d

# 2) Regenerar los baselines
E2E_BASE_URL=http://127.0.0.1:8080 E2E_API_URL=http://127.0.0.1:8080/api \
  npx playwright test --project visual --no-deps --update-snapshots

# 3) Verificar que son estables (segunda corrida, sin actualizar)
E2E_BASE_URL=http://127.0.0.1:8080 E2E_API_URL=http://127.0.0.1:8080/api \
  npx playwright test --project visual --no-deps

# 4) PR dedicado con los PNG regenerados
```

Reglas:

- El staging debe servir **el código que se quiere capturar**. Un baseline
  generado contra un build viejo congela la UI vieja.
- Si un baseline cambia por motivos de **datos** (no de diseño), el arreglo
  es enmascarar la región (`volatileSelectors` / `volatileCards` en
  `visual-targets.ts`), **no** subir la tolerancia.
- Los baselines son específicos de plataforma (el sufijo `-linux.png` lo
  decide Playwright). El CI corre en `ubuntu-latest` con el mismo Chromium y
  las fuentes embebidas (Inter / Roboto Mono), así que el mismo baseline sirve
  para local y CI.

### Qué se compara y qué no

El staging **muta en cada corrida e2e** (empleados `E2E Kiosk ...`, auditorías,
conteos de plantilla). Comparar ese contenido produce un baseline que se
rompe en cada ejecución: un test que miente. Por eso:

| Palanca           | Dónde                                  | Qué resuelve                                  |
| ----------------- | -------------------------------------- | --------------------------------------------- |
| Reloj fijo        | `page.clock.setFixedTime` en el spec   | saludo por hora, fechas, "hoy"                |
| Zona horaria fija | `timezoneId` en `playwright.config.ts` | misma hora local en runner y CI               |
| Enmascarado       | `volatileSelectors` / `volatileCards`  | clima, reloj del servidor, conteos, auditoría |

El resto de la página (jerarquía, tipografía, color, espaciado, estados vacíos)
**sí** se compara: es lo que la regresión visual debe proteger.

## Release y rendimiento manual

CI no levanta staging ni ejecuta Lighthouse. CD construye las imágenes una vez,
ejecuta los proyectos `functional` y `visual` y publica los mismos artefactos.
`startup-regressions.spec.ts` conserva las regresiones de arranque, overlays,
carga diferida y solicitudes redundantes con una visita por caso. `perf`
conserva series y diagnósticos para uso manual.

Para medir una release, abrir Actions → **Rendimiento manual** → Run workflow.
Copiar `backend_image`, `frontend_image` y `gateway_image` desde el manifiesto
`release-images.json` del artefacto `release-validation-<run_id>` de CD.
Las referencias deben ser del repositorio GHCR correspondiente y terminar en
`@sha256:<64 caracteres hexadecimales>`; no se aceptan tags como `latest`.
Elegir un ref del workflow cuyo harness sea compatible con la release medida.
El workflow descarga las imágenes, crea una base aislada con seed de pruebas,
ejecuta Lighthouse sobre 17 rutas y elimina stack y volúmenes al terminar.
No realiza builds, pushes ni cambios en producción. El artefacto de siete días
incluye HTML/JSON, imágenes de entrada, métricas y aserciones por ruta.

La batería local `npm run perf:staging` sigue disponible bajo demanda. No hay
benchmarks automáticos por PR, release o calendario.
