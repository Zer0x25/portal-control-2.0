# Frontend PORTAL

Aplicacion SPA para el sistema PORTAL, construida con React + Vite + TypeScript.

## Stack

- React 19
- Vite 8
- TypeScript
- TanStack Query v5
- Zustand

## Desarrollo local

Desde `Frontend/`:

```bash
npm install
npm run dev
```

Frontend disponible en `http://localhost:5173`.

## React Compiler

React Compiler está activo en el servidor de desarrollo de Vite, Vitest y los
builds de producción mediante `@vitejs/plugin-react` y `oxc-transform-react`.
El build muestra diagnósticos de los componentes que el compilador omite. En
componentes compilados, no agregues `useMemo`, `useCallback` o `React.memo`
solo para estabilizar props de React; conserva memoización manual únicamente
para hot paths medidos, suscripciones externas o componentes omitidos, y
documenta el motivo junto al código.

## Métricas web y budgets

`web-vitals` se carga en tiempo ocioso y añade a Sentry los valores LCP, INP,
CLS, FCP y TTFB con ruta, rol, dispositivo y conexión. Las transacciones de
`browserTracingIntegration` siguen siendo la fuente canónica; solo una métrica
degradada genera breadcrumb. Lighthouse CI mide las rutas con sesión sembrada
y gatea LCP, CLS, FCP, respuesta del servidor y score general. INP se observa
con `web-vitals` en campo; el modo de navegación de Lighthouse no produce una
métrica INP sin interacción de usuario.

Después del build, `npm run check:bundle-budget` mide `react-core`, `charts` y
el precache del Service Worker. `npm run audit:memoization` enumera las
llamadas manuales para auditar la política del compilador.

## Calidad

Desde `Frontend/`:

```bash
npm run check
npm run lint
npm run test:run
npm run guardrails
```

`npm run guardrails` es el chequeo recomendado para CI del hardening frontend. Ejecuta la suite que valida:

- Reglas ESLint contra patrones temporales inseguros.
- Guardrails de separación `view` para perímetros auditados.
- Congelamiento de vistas auditadas sin `ReturnType<typeof useX>`.

## Documentacion oficial

La documentacion consolidada del proyecto vive en la raiz `docs/`.

- Indice maestro: [`../docs/README.md`](../docs/README.md)
- Estado actual del proyecto: [`../docs/PROJECT_STATUS.md`](../docs/PROJECT_STATUS.md)
- Guia de desarrollo: [`../docs/DEVELOPER_GUIDE.md`](../docs/DEVELOPER_GUIDE.md)
- Arquitectura: [`../docs/architecture/overview.md`](../docs/architecture/overview.md)

## 🚀 Funcionalidades Transversales de la App

Funcionalidades que afectan a toda la aplicación y no pertenecen a features específicas:

### **Notificaciones Globales**

- Sistema de notificaciones push del navegador
- Alertas contextuales basadas en estado del usuario
- Centro de notificaciones unificado
- Configuración de preferencias de notificaciones

### **Modo Offline/PWA**

- Service Worker para cache inteligente
- Sincronización automática al reconectar
- Modo offline limitado para funcionalidades críticas
- Instalación PWA en dispositivos

### **Personalización Global**

- Sistema de temas dinámicos (colores, fuentes, densidad)
- Configuraciones guardadas por usuario
- Preferencias de accesibilidad
- Respeto a preferencias del sistema (modo oscuro, movimiento reducido)

### **Monitoreo y Observabilidad**

- Sentry para error tracking
- Métricas de performance
- Health checks automáticos
- Logging estructurado

### **Seguridad Frontend**

- Validación de inputs con Zod
- Sanitización de datos
- Protección contra XSS
- Manejo seguro de tokens

### **Internacionalización (i18n)**

- Soporte multi-idioma
- Formatos locales (fechas, números, monedas)
- RTL support para idiomas árabes/hebreos

### **Accesibilidad (a11y)**

- Cumplimiento WCAG 2.1 AA
- Navegación por teclado completa
- Soporte para lectores de pantalla
- Contraste adecuado de colores

## 📁 Estructura de Features

Cada feature tiene su propio directorio bajo `src/features/` con límites claros:

- **`dashboard/`**: Dashboard regular (usuario) - widgets básicos, métricas simples
- **`supervisor-dashboard/`**: Dashboard supervisor - analytics avanzados, gestión de equipo
- **`auth/`**: Autenticación y autorización
- **`profile/`**: Perfil de usuario y configuraciones personales
- **`reports/`**: Generación y gestión de reportes
- **`time-control/`**: Control de tiempo y asistencia

**Regla importante**: Las funcionalidades transversales se implementan en la raíz de `src/` o en utilidades compartidas, nunca dentro de una feature específica.

Ver [FUTURE_FEATURES.md](FUTURE_FEATURES.md) para el plan de funcionalidades transversales futuras.
