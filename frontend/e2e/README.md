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
- Kiosco (`/#/kiosk`): fuera del shell (sin `app-shell`/`main-content`);
  `page-container`, `kiosk-step[data-step]`
  (`rut_input|employee_list|pin_input|actions|success|change_pin`), `kiosk-display`,
  `kiosk-keypad`, `kiosk-key-<1..9,K,0>`, `kiosk-key-delete`, `kiosk-key-confirm`,
  `kiosk-exit-button`, `kiosk-rut-error`, `kiosk-pin-error`.
