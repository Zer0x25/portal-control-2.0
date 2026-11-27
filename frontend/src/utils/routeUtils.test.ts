import { describe, it, expect } from "vitest";
import { getDefaultRouteForRole } from "./routeUtils";
import { ROUTES } from "../constants";

describe("getDefaultRouteForRole", () => {
  it("redirects Supervisor to supervisor dashboard", () => {
    expect(getDefaultRouteForRole("Supervisor")).toBe(ROUTES.SUPERVISOR_DASHBOARD);
  });

  it("redirects Usuario to worker portal", () => {
    expect(getDefaultRouteForRole("Usuario")).toBe(ROUTES.WORKER_PORTAL);
  });

  it("redirects Fiscalizador to time control", () => {
    expect(getDefaultRouteForRole("Fiscalizador")).toBe(ROUTES.TIME_CONTROL);
  });

  it("redirects Super_Administrador to dashboard when control interno is enabled", () => {
    expect(getDefaultRouteForRole("Super_Administrador", true)).toBe(ROUTES.DASHBOARD);
  });

  it("redirects Super_Administrador to supervisor dashboard when control interno is disabled", () => {
    expect(getDefaultRouteForRole("Super_Administrador", false)).toBe(ROUTES.SUPERVISOR_DASHBOARD);
  });

  it("redirects Reloj_Control appropriately", () => {
    expect(getDefaultRouteForRole("Reloj_Control", true)).toBe(ROUTES.DASHBOARD);
  });
});
