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

  it("keeps Supervisión in Supervisor, Supervisor_Elevado and Administrador menus", () => {
    for (const role of ["Supervisor", "Supervisor_Elevado", "Administrador"] as const) {
      const items = buildSidebarMenuByRole({
        role,
        isControlInternoEnabled: true,
      });

      expect(items.some((item) => item.to === ROUTES.SUPERVISOR_DASHBOARD)).toBe(true);
    }
  });
});
