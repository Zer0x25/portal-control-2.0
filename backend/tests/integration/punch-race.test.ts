import { afterAll, beforeAll, describe, expect, it } from "vitest";
import prisma from "../../src/services/db";
import { ulid } from "ulid";
import { PunchService } from "../../src/services/PunchService";
import { getChileDateISO } from "../../src/utils/timeUtils";

// Anti-regresión caza-bugs 2026-10-04: 5 fichajes concurrentes (doble-tap de
// kiosco) creaban hasta 3 filas abiertas mismo empleado/día — todos HTTP 200.
// Con lock advisory por empleado, solo queda 1 fila (equivalente serial).
describe("Punch concurrent race", () => {
  const testEmployeeId = `it-punchrace-emp-${ulid()}`;
  const fakeReq = { user: { username: "race-test" } };

  beforeAll(async () => {
    await prisma.employee.create({
      data: {
        id: testEmployeeId,
        name: "Punch Race Employee",
        rut: `85${String(Date.now()).slice(-7)}-1`,
        position: "Operator",
        area: "Ops",
        workdayType: "Ordinaria",
        status: "Activo",
      },
    });
  });

  afterAll(async () => {
    await prisma.timeRecord.deleteMany({ where: { employeeId: testEmployeeId } });
    await prisma.employee.deleteMany({ where: { id: testEmployeeId } });
  });

  it("5 fichajes concurrentes dejan una sola fila abierta", async () => {
    const results = await Promise.allSettled(
      [1, 2, 3, 4, 5].map(() => PunchService.handlePunch(fakeReq, testEmployeeId, "RACE_TEST")),
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    expect(ok).toBeGreaterThanOrEqual(1);

    const rows = await prisma.timeRecord.findMany({
      where: { employeeId: testEmployeeId, date: getChileDateISO(), isDeleted: false },
    });
    expect(rows.length).toBe(1);
  });
});
