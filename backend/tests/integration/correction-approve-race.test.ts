import { afterAll, beforeAll, describe, expect, it } from "vitest";
import prisma from "../../src/services/db";
import { ulid } from "ulid";
import { CorrectionService } from "../../src/services/CorrectionService";

// Anti-regresión del reporte 2026-10-04: N approves concurrentes sobre la
// misma solicitud pendiente. Un solo ganador aplica el parche; el resto
// retorna el estado resuelto (200, sin error) y el estado final NUNCA
// queda pendiente.
describe("Correction approve race", () => {
  const testEmployeeId = `it-race-emp-${ulid()}`;
  const testUserId = ulid();
  const recordId = `it-race-rec-${ulid()}`;
  const requestId = `it-race-req-${ulid()}`;
  const requestedSalida = "2026-03-10T21:00:00.000Z";

  beforeAll(async () => {
    await prisma.employee.create({
      data: {
        id: testEmployeeId,
        name: "Race Test Employee",
        rut: `87${String(Date.now()).slice(-7)}-1`,
        position: "Operator",
        area: "Ops",
        workdayType: "Ordinaria",
        status: "Activo",
      },
    });
    await prisma.user.create({
      data: {
        id: testUserId,
        username: `it_race_${ulid().toLowerCase()}`,
        passwordHash: "dummy",
        role: "Usuario",
        employeeId: testEmployeeId,
      },
    });
    await prisma.timeRecord.create({
      data: {
        id: recordId,
        employeeId: testEmployeeId,
        employeeName: "Race",
        date: "2026-03-10",
        entrada: "2026-03-10T12:00:00.000Z",
        salida: "2026-03-10T20:00:00.000Z",
        status: "Completado",
      },
    });
    await prisma.correctionRequest.create({
      data: {
        id: requestId,
        employeeId: testEmployeeId,
        timeRecordId: recordId,
        recordField: "salida",
        originalValue: "2026-03-10T20:00:00.000Z",
        requestedValue: requestedSalida,
        reason: "race test",
        status: "pending",
      },
    });
  });

  afterAll(async () => {
    await prisma.correctionRequest.deleteMany({ where: { id: requestId } });
    await prisma.timeRecord.deleteMany({ where: { id: recordId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.employee.deleteMany({ where: { id: testEmployeeId } });
  });

  it("5 approves concurrentes: todos 200 approved, uno solo parcha", async () => {
    const results = await Promise.all(
      [1, 2, 3, 4, 5].map(() =>
        CorrectionService.updateStatus(requestId, {
          status: "approved",
          resolvedBy: "admin",
          actorUsername: "admin",
          actorRole: "Administrador",
        }),
      ),
    );
    for (const r of results) expect(r.status).toBe("approved");

    const final = await prisma.correctionRequest.findUnique({ where: { id: requestId } });
    expect(final?.status).toBe("approved");

    const record = await prisma.timeRecord.findUnique({ where: { id: recordId } });
    expect(record?.salida).toBe(requestedSalida);

    const edits = await prisma.auditLog.count({
      where: {
        action: "TIME_RECORD_EDITED",
        details: { path: ["correctionRequestId"], equals: requestId },
      },
    });
    expect(edits).toBe(1);
  });

  it("permite aprobar corrección en turno de 12 horas con marcaje previo (07:55 a 20:00) y colación", async () => {
    const shiftRecId = `it-12h-rec-${ulid()}`;
    const shiftReqId = `it-12h-req-${ulid()}`;

    await prisma.timeRecord.create({
      data: {
        id: shiftRecId,
        employeeId: testEmployeeId,
        employeeName: "Race",
        date: "2026-03-11",
        entrada: "2026-03-11T07:55:00.000Z",
        inicioColacion: "2026-03-11T13:30:00.000Z",
        finColacion: "2026-03-11T14:25:00.000Z",
        salida: "2026-03-11T20:00:00.000Z",
        status: "Completado",
      },
    });

    await prisma.correctionRequest.create({
      data: {
        id: shiftReqId,
        employeeId: testEmployeeId,
        timeRecordId: shiftRecId,
        recordField: "inicioColacion",
        originalValue: "2026-03-11T13:30:00.000Z",
        requestedValue: "2026-03-11T13:20:00.000Z",
        reason: "Ajuste por validacion de reloj en terreno.",
        status: "pending",
      },
    });

    try {
      const res = await CorrectionService.updateStatus(shiftReqId, {
        status: "approved",
        resolvedBy: "admin",
        actorUsername: "admin",
        actorRole: "Administrador",
      });
      expect(res.status).toBe("approved");

      const updated = await prisma.timeRecord.findUnique({ where: { id: shiftRecId } });
      expect(updated?.inicioColacion).toBe("2026-03-11T13:20:00.000Z");
    } finally {
      await prisma.correctionRequest.deleteMany({ where: { id: shiftReqId } });
      await prisma.timeRecord.deleteMany({ where: { id: shiftRecId } });
    }
  });
});
