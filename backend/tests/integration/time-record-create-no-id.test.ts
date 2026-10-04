import { afterAll, beforeAll, describe, expect, it } from "vitest";
import prisma from "../../src/services/db";
import { ulid } from "ulid";
import { TimeRecordService } from "../../src/services/TimeRecordService";

// Anti-regresión 2026-10-04: POST /api/records sin id devolvía 500
// (findUnique con id undefined). El contrato es createOrUpdate con id
// opcional: la primera llamada crea (id acuñado en servidor), la segunda
// mismo empleado/día reutiliza sin duplicar.
describe("TimeRecord create without id", () => {
  const testEmployeeId = `it-noid-emp-${ulid()}`;
  const date = "2026-04-10";

  beforeAll(async () => {
    await prisma.employee.create({
      data: {
        id: testEmployeeId,
        name: "NoId Test Employee",
        rut: `86${String(Date.now()).slice(-7)}-1`,
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

  it("crea con id generado y reutiliza sin duplicar", async () => {
    const base = {
      employeeId: testEmployeeId,
      employeeName: "NoId",
      date,
      entrada: `${date}T12:00:00.000Z`,
      salida: `${date}T20:00:00.000Z`,
      status: "Completado",
    };
    const created = await TimeRecordService.saveRecord({ ...base }, "admin");
    expect(typeof created.id).toBe("string");
    expect(created.id.length).toBeGreaterThan(0);

    const reused = await TimeRecordService.saveRecord({ ...base }, "admin");
    expect(reused.id).toBe(created.id);

    const count = await prisma.timeRecord.count({
      where: { employeeId: testEmployeeId, date, isDeleted: false },
    });
    expect(count).toBe(1);
  });
});
