import { describe, expect, it } from "vitest";
import type { Employee } from "../../types";
import { shouldLoadAutoStartSchedule } from "../../utils/autoStartEligibility";

const clockEmployee: Employee = {
  id: "EMP-1",
  name: "Operador",
  position: "Reloj_Control",
  area: "Operaciones",
  workdayType: "Full-Time",
  status: "Activo",
  isDeleted: false,
  lastModified: 0,
  syncStatus: "synced",
};

describe("auto-start scheduling eligibility", () => {
  it("loads schedule for a Reloj_Control account with an employee", () => {
    expect(shouldLoadAutoStartSchedule("Reloj_Control", "EMP-1", clockEmployee)).toBe(true);
  });

  it.each(["Administrador", "Supervisor_Elevado"] as const)(
    "loads schedule for %s only when the associated employee is Reloj_Control",
    (role) => {
      expect(shouldLoadAutoStartSchedule(role, "EMP-1", clockEmployee)).toBe(true);
      expect(
        shouldLoadAutoStartSchedule(role, "EMP-1", { ...clockEmployee, position: "Supervisor" }),
      ).toBe(false);
    },
  );

  it.each([
    ["Reloj_Control", undefined, clockEmployee],
    ["Administrador", undefined, clockEmployee],
    ["Administrador", "EMP-1", undefined],
    ["Usuario", "EMP-1", clockEmployee],
    ["Supervisor", "EMP-1", clockEmployee],
  ] as const)("does not load schedule for an ineligible profile", (role, employeeId, employee) => {
    expect(shouldLoadAutoStartSchedule(role, employeeId, employee)).toBe(false);
  });
});
