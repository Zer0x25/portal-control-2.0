/**
 * Conjunto curado y único de rutas para la suite de regresión visual (AC4).
 *
 * Incluye exactamente las rutas de las certificaciones e2e existentes:
 * - dashboard
 * - planificador
 * - worker-portal
 * - kiosk
 * - logbook
 * - governance
 *
 * ## Datos vivos vs. snapshot determinista
 *
 * La app se renderiza contra el staging, cuyos datos **cambian** en cada
 * corrida e2e (empleados `E2E Kiosk ...`, marcas de tiempo, conteos de
 * plantilla, auditorías). Un snapshot que compara ese contenido se rompe en
 * cada corrida: es un test que miente. Por eso cada target declara
 * explícitamente qué regiones son "vivas" y se **enmascaran** (Playwright las
 * pinta como un bloque sólido): el snapshot compara el *cromo* y el diseño,
 * que es lo que la regresión visual debe proteger.
 *
 * - `volatileSelectors`: selectores CSS de widgets con dato vivo.
 * - `volatileCards`: títulos (texto DOM, no el renderizado en mayúsculas)
 *   de tarjetas cuyo cuerpo depende del backend.
 */

export interface VisualTarget {
  id: string;
  name: string;
  route: string;
  role: "admin" | "worker" | "public";
  waitForSelector?: string;
  /** Selectores CSS de regiones con datos vivos: se enmascaran, no se comparan. */
  volatileSelectors?: string[];
  /** Títulos de tarjetas cuyo cuerpo depende del backend: se enmascaran. */
  volatileCards?: string[];
  /**
   * CSS inyectado en la página antes de capturar. Sirve para **fijar la
   * geometría** de una región cuyo alto depende del volumen de datos, de
   * modo que la región enmascarada tenga siempre el mismo alto y el snapshot
   * no dependa de cuántos registros hay en la base.
   */
  style?: string;
}

export const VISUAL_TARGETS: VisualTarget[] = [
  {
    id: "dashboard",
    name: "Dashboard Principal",
    route: "/#/dashboard",
    role: "admin",
    waitForSelector: "main",
    // Clima (API externa Open-Meteo) y reloj del servidor: cambian en cada
    // instante. Los conteos de alertas/plantilla/últimos turnos dependen del
    // estado del staging, que muta con cada corrida e2e.
    volatileSelectors: ['[data-testid="weather-display"]', '[data-testid="server-clock"]'],
    volatileCards: ["Gestión de Alertas", "Panel de Operación", "Historial de Turnos"],
  },
  {
    id: "planificador",
    name: "Planificador Teórico de Turnos",
    route: "/#/theoretical-shifts",
    role: "admin",
    waitForSelector: "main",
  },
  {
    id: "worker-portal",
    name: "Portal del Trabajador",
    route: "/#/worker-portal",
    role: "worker",
    waitForSelector: "main",
    // El worker lo crea la factoría e2e con nombre e id aleatorios: sin
    // enmascarar, el nombre cambia en cada corrida (en la cabecera y en la
    // tarjeta de identidad).
    volatileSelectors: [
      '[data-testid="worker-identity"]',
      '[data-testid="worker-identity-code"]',
      '[data-testid="app-header-user"]',
    ],
  },
  {
    id: "kiosk",
    name: "Kiosco de Fichaje",
    route: "/#/kiosk",
    role: "public",
    waitForSelector: '[data-testid="kiosk-keypad"]',
  },
  {
    id: "logbook",
    name: "Libro de Registro y Novedades",
    route: "/#/logbook",
    role: "admin",
    waitForSelector: "main",
  },
  {
    id: "governance",
    name: "Centro de Gobernanza y Auditoría",
    route: "/#/admin/governance",
    role: "admin",
    waitForSelector: "main",
    // Métricas de salud, badges de estado de integridad y la tabla de alertas
    // dependen de auditorías que pueden ejecutarse durante la suite.
    //
    // La tabla tiene un alto que depende del historial de auditoría del
    // entorno: 0 filas en una base recién sembrada (CI), N en un staging de
    // larga vida. Se acota a un alto fijo para que la región enmascarada
    // tenga siempre la misma geometría; el contenido ya está enmascarado, así
    // que el snapshot sigue comparando el resto de la consola.
    volatileSelectors: [
      "span.tabular-nums",
      '[data-testid="governance-integrity-table"]',
      "text=/^(Sincronizado|Anomalía)$/",
      "text=/^Cargando\.\.\.$/",
    ],
    style: '[data-testid="governance-integrity-table"] { height: 160px; overflow: hidden; }',
  },
];
