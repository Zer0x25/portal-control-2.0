import { describe, expect, it } from "vitest";
import { buildSidebarMenuByRole } from "../../../hooks/layout/sidebarMenu";
import { ROUTES } from "../../../constants";

describe("buildSidebarMenuByRole", () => {
  it("excludes Supervisión (dashboard-supervisor) from Fiscalizador menu", () => {
    const items = buildSidebarMenuByRole({
      role: "Fiscalizador",
      isControlInternoEnabled: true,
    });

    expect(items.some((item) => item.to === ROUTES.SUPERVISOR_DASHBOARD)).toBe(false);
    expect(items.map((item) => item.to)).toEqual([
      ROUTES.TIME_CONTROL,
      ROUTES.COMMUNICATIONS,
      ROUTES.SHIFT_CALENDAR,
      ROUTES.AUDIT_LOGS,
    ]);
  });

  it("hides Comunicados from Fiscalizador menu when isControlInternoEnabled is false", () => {
    const items = buildSidebarMenuByRole({
      role: "Fiscalizador",
      isControlInternoEnabled: false,
    });

    expect(items.some((item) => item.to === ROUTES.COMMUNICATIONS)).toBe(false);
    expect(items.map((item) => item.to)).toEqual([
      ROUTES.TIME_CONTROL,
      ROUTES.SHIFT_CALENDAR,
      ROUTES.AUDIT_LOGS,
    ]);
  });

  it("keeps Supervisión in Supervisor, Administrador and Super_Administrador menus", () => {
    for (const role of ["Supervisor", "Administrador", "Super_Administrador"] as const) {
      const items = buildSidebarMenuByRole({
        role,
        isControlInternoEnabled: true,
      });

      expect(items.some((item) => item.to === ROUTES.SUPERVISOR_DASHBOARD)).toBe(true);
    }
  });

  it("shows Config only to Super_Administrador and Administrador", () => {
    for (const role of ["Super_Administrador", "Administrador"] as const) {
      const items = buildSidebarMenuByRole({
        role,
        isControlInternoEnabled: true,
      });
      expect(items.some((item) => item.to === ROUTES.CONFIGURATION)).toBe(true);
    }

    for (const role of ["Supervisor", "Reloj_Control", "Usuario", "Fiscalizador"] as const) {
      const items = buildSidebarMenuByRole({
        role,
        isControlInternoEnabled: true,
      });
      expect(items.some((item) => item.to === ROUTES.CONFIGURATION)).toBe(false);
    }
  });
});
