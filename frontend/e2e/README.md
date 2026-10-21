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

## Regresión Visual (Spec 035 - AC4)

La suite de regresión visual (`e2e/visual-regression.spec.ts`) valida el aspecto
estético y layout de las rutas críticas curadas (`e2e/visual-targets.ts`):
- `dashboard`
- `planificador`
- `worker-portal`
- `kiosk`
- `logbook`
- `governance`

Se ejecutan en tema **claro (`light`)** y **oscuro (`dark`)**, con umbral estricto `maxDiffPixelRatio: 0.05`.

### Ejecución
```bash
# Ejecutar solo la suite visual
npx playwright test --project visual

# Ejecutar con visor de reportes
npx playwright show-report
```

### Política de Actualización de Baselines
Los snapshots de referencia viven versionados en el repositorio bajo `frontend/e2e/__snapshots__/` o directorios generados por Playwright.
> [!IMPORTANT]
> **Actualización de Baselines**: La actualización de capturas mediante `--update-snapshots`
> es una operación **explícita y separada** (PR dedicado de baselines con revisión
> minuciosa del diff visual, NUNCA camuflada dentro de un PR de refactor o lógica).
```bash
npx playwright test --project visual --update-snapshots
```

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
