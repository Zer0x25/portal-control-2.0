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
 */

export interface VisualTarget {
  id: string;
  name: string;
  route: string;
  role: "admin" | "worker" | "public";
  waitForSelector?: string;
}

export const VISUAL_TARGETS: VisualTarget[] = [
  {
    id: "dashboard",
    name: "Dashboard Principal",
    route: "/#/dashboard",
    role: "admin",
    waitForSelector: "main",
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
  },
];
