import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import prisma, { withDirectTransaction } from "../../src/services/db";
import { ulid } from "ulid";
import { CorrectionService } from "../../src/services/CorrectionService";
import { TimeRecordService } from "../../src/services/TimeRecordService";
import { timeRecordIntegrityService } from "../../src/services/timeRecordIntegrityService";

// Anti-regresión del reporte 2026-10-04: N approves concurrentes sobre la
// misma solicitud pendiente. Un solo ganador aplica el parche; el resto
// retorna el estado resuelto (200, sin error) y el estado final NUNCA
// queda pendiente.
describe("Correction approve race", () => {
  const testEmployeeId = `it-race-emp-${ulid()}`;
  const testUserId = ulid();
  const recordId = `it-race-rec-${ulid()}`;
  const requestId = `it-race-req-${ulid()}`;
  const day = new Date(Date.now() - 2 * 86400_000).toISOString().slice(0, 10);
  const requestedSalida = `${day}T21:00:00.000Z`;

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
        date: day,
        entrada: `${day}T12:00:00.000Z`,
        salida: `${day}T20:00:00.000Z`,
        status: "Completado",
      },
    });
    await prisma.correctionRequest.create({
      data: {
        id: requestId,
        employeeId: testEmployeeId,
        timeRecordId: recordId,
        recordField: "salida",
        originalValue: `${day}T20:00:00.000Z`,
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
          actorRole: "Super_Administrador",
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
        date: day,
        entrada: `${day}T07:55:00.000Z`,
        inicioColacion: `${day}T13:30:00.000Z`,
        finColacion: `${day}T14:25:00.000Z`,
        salida: `${day}T20:00:00.000Z`,
        status: "Completado",
      },
    });

    await prisma.correctionRequest.create({
      data: {
        id: shiftReqId,
        employeeId: testEmployeeId,
        timeRecordId: shiftRecId,
        recordField: "inicioColacion",
        originalValue: `${day}T13:30:00.000Z`,
        requestedValue: `${day}T13:20:00.000Z`,
        reason: "Ajuste por validacion de reloj en terreno.",
        status: "pending",
      },
    });

    try {
      const res = await CorrectionService.updateStatus(shiftReqId, {
        status: "approved",
        resolvedBy: "admin",
        actorUsername: "admin",
        actorRole: "Super_Administrador",
      });
      expect(res.status).toBe("approved");

      const updated = await prisma.timeRecord.findUnique({ where: { id: shiftRecId } });
      expect(updated?.inicioColacion).toBe(`${day}T13:20:00.000Z`);
    } finally {
      await prisma.correctionRequest.deleteMany({ where: { id: shiftReqId } });
      await prisma.timeRecord.deleteMany({ where: { id: shiftRecId } });
    }
  });

  it("serializa aprobaciones concurrentes de campos diferentes", async () => {
    const raceRecord = `it-fields-${ulid()}`;
    const firstId = `it-fields-a-${ulid()}`;
    const secondId = `it-fields-b-${ulid()}`;
    const stamp = (time: string) => `${day}T${time}:00.000Z`;
    await prisma.timeRecord.create({
      data: {
        id: raceRecord,
        employeeId: testEmployeeId,
        employeeName: "Race",
        date: day,
        entrada: stamp("08:00"),
        inicioColacion: stamp("09:00"),
        finColacion: stamp("10:00"),
        salida: stamp("12:00"),
        status: "Completado",
      },
    });
    await prisma.correctionRequest.createMany({
      data: [
        {
          id: firstId,
          employeeId: testEmployeeId,
          timeRecordId: raceRecord,
          recordField: "inicioColacion",
          originalValue: stamp("09:00"),
          requestedValue: stamp("09:50"),
          reason: "prueba",
        },
        {
          id: secondId,
          employeeId: testEmployeeId,
          timeRecordId: raceRecord,
          recordField: "finColacion",
          originalValue: stamp("10:00"),
          requestedValue: stamp("09:10"),
          reason: "prueba",
        },
      ],
    });
    try {
      const results = await Promise.allSettled(
        [firstId, secondId].map((id) =>
          CorrectionService.updateStatus(id, { status: "approved", resolvedBy: "admin" }),
        ),
      );
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
      const record = await prisma.timeRecord.findUniqueOrThrow({ where: { id: raceRecord } });
      expect(new Date(record.inicioColacion!).getTime()).toBeLessThan(
        new Date(record.finColacion!).getTime(),
      );
      const pending = await prisma.correctionRequest.count({
        where: { id: { in: [firstId, secondId] }, status: "pending" },
      });
      expect(pending).toBe(1);
    } finally {
      await prisma.correctionRequest.deleteMany({ where: { id: { in: [firstId, secondId] } } });
      await prisma.timeRecord.deleteMany({ where: { id: raceRecord } });
    }
  });

  it("evita duplicados nuevos concurrentes sin borrar pendientes históricas", async () => {
    const recordId = `it-create-${ulid()}`;
    const original = `${day}T08:00:00.000Z`;
    await prisma.timeRecord.create({
      data: {
        id: recordId,
        employeeId: testEmployeeId,
        employeeName: "Race",
        date: day,
        entrada: original,
        status: "Laborando",
      },
    });
    const input = {
      employeeId: testEmployeeId,
      timeRecordId: recordId,
      recordField: "entrada",
      originalValue: "valor-del-cliente",
      requestedValue: `${day}T07:50:00.000Z`,
      reason: "prueba",
    };
    try {
      const results = await Promise.allSettled(
        [1, 2].map(() =>
          CorrectionService.create(input, {
            role: "Usuario",
            employeeId: testEmployeeId,
            username: "test",
          }),
        ),
      );
      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      const failure = results.find((result) => result.status === "rejected");
      expect(failure && failure.status === "rejected" && failure.reason.code).toBe(
        "CORRECTION_PENDING",
      );
      const saved = await prisma.correctionRequest.findFirstOrThrow({
        where: { timeRecordId: recordId },
      });
      expect(saved.originalValue).toBe(original);
      await prisma.correctionRequest.create({
        data: { ...input, id: `historical-${ulid()}`, originalValue: original },
      });
      await expect(
        CorrectionService.create(input, { role: "Usuario", employeeId: testEmployeeId }),
      ).rejects.toMatchObject({ code: "CORRECTION_PENDING" });
      expect(
        await prisma.correctionRequest.count({
          where: { timeRecordId: recordId, status: "pending" },
        }),
      ).toBe(2);
    } finally {
      await prisma.correctionRequest.deleteMany({ where: { timeRecordId: recordId } });
      await prisma.timeRecord.deleteMany({ where: { id: recordId } });
    }
  });

  it("serializa una aprobación y otra escritura del empleado y conserva la cadena", async () => {
    const employeeId = `it-mixed-emp-${ulid()}`;
    const correctedId = `it-mixed-corrected-${ulid()}`;
    const writtenId = `it-mixed-written-${ulid()}`;
    const correctionId = `it-mixed-request-${ulid()}`;
    const original = `${day}T08:00:00.000Z`;
    const corrected = `${day}T07:50:00.000Z`;
    await prisma.employee.create({
      data: {
        id: employeeId,
        name: "Mixed Race Employee",
        rut: `86${String(Date.now()).slice(-7)}-1`,
        position: "Operator",
        area: "Ops",
        workdayType: "Ordinaria",
        status: "Activo",
      },
    });
    let releaseApproval!: () => void;
    let reportApprovalEntered!: () => void;
    const approvalEntered = new Promise<void>((resolve) => {
      reportApprovalEntered = resolve;
    });
    const approvalGate = new Promise<void>((resolve) => {
      releaseApproval = resolve;
    });
    const originalSeal = timeRecordIntegrityService.sealAfterMutation.bind(
      timeRecordIntegrityService,
    );
    let approval: Promise<unknown> | undefined;
    let writer: Promise<unknown> | undefined;
    let sealSpy: ReturnType<typeof vi.spyOn> | undefined;
    try {
      await prisma.timeRecord.create({
        data: {
          id: correctedId,
          createdAt: new Date(Date.now() - 10_000),
          employeeId,
          employeeName: "Mixed",
          date: day,
          entrada: original,
          status: "Laborando",
        },
      });
      await prisma.timeRecord.create({
        data: {
          id: writtenId,
          createdAt: new Date(Date.now() - 5_000),
          employeeId,
          employeeName: "Mixed",
          date: day,
          entrada: original,
          status: "Laborando",
        },
      });
      await withDirectTransaction(async (tx) => {
        await originalSeal(tx, employeeId, correctedId, { skipAudit: true });
      });
      await prisma.correctionRequest.create({
        data: {
          id: correctionId,
          employeeId,
          timeRecordId: correctedId,
          recordField: "entrada",
          originalValue: original,
          requestedValue: corrected,
          reason: "prueba",
        },
      });
      sealSpy = vi
        .spyOn(timeRecordIntegrityService, "sealAfterMutation")
        .mockImplementation(async (tx, id, recordId, options) => {
          if (recordId === correctedId) {
            reportApprovalEntered();
            await approvalGate;
          }
          return originalSeal(tx, id, recordId, options);
        });
      approval = CorrectionService.updateStatus(correctionId, {
        status: "approved",
        resolvedBy: "admin",
      });
      await Promise.race([
        approvalEntered,
        approval.then(() => {
          throw new Error("Approval finished before reaching the seal");
        }),
      ]);
      writer = TimeRecordService.saveRecord(
        {
          id: writtenId,
          employeeId,
          employeeName: "Mixed",
          date: day,
          entrada: `${day}T08:15:00.000Z`,
          status: "Laborando",
        },
        "admin",
      );
      void writer.catch(() => {});
      // Observe the real PostgreSQL advisory wait before allowing approval to commit.
      let waiting = false;
      for (let attempt = 0; attempt < 100 && !waiting; attempt++) {
        const rows = await prisma.$queryRaw<
          Array<{ count: bigint }>
        >`SELECT count(*) AS count FROM pg_locks WHERE locktype = 'advisory' AND NOT granted AND objsubid = 1 AND objid::bigint = (hashtext(${`punch:${employeeId}`})::bigint & 4294967295)`;
        waiting = rows[0].count > 0n;
        if (!waiting) await new Promise((resolve) => setTimeout(resolve, 25));
      }
      expect(waiting).toBe(true);
      releaseApproval();
      await Promise.all([approval, writer]);
      expect(
        (await prisma.correctionRequest.findUniqueOrThrow({ where: { id: correctionId } })).status,
      ).toBe("approved");
      expect(
        (await prisma.timeRecord.findUniqueOrThrow({ where: { id: correctedId } })).entrada,
      ).toBe(corrected);
      expect(
        (await prisma.timeRecord.findUniqueOrThrow({ where: { id: writtenId } })).entrada,
      ).toBe(`${day}T08:15:00.000Z`);
      const integrity = await withDirectTransaction((tx) =>
        timeRecordIntegrityService.verifyChain(tx, { employeeId }),
      );
      expect(integrity).toMatchObject({ checkedCount: 2, brokenCount: 0 });
    } finally {
      releaseApproval();
      await Promise.allSettled([...(approval ? [approval] : []), ...(writer ? [writer] : [])]);
      sealSpy?.mockRestore();
      await prisma.correctionRequest.deleteMany({ where: { id: correctionId } });
      await prisma.timeRecord.deleteMany({ where: { employeeId } });
      await prisma.employee.deleteMany({ where: { id: employeeId } });
    }
  }, 15_000);

  it("rechaza aprobación obsoleta y conserva solicitud y jornada", async () => {
    const recordId = `it-stale-${ulid()}`;
    const reqId = `it-stale-req-${ulid()}`;
    const actual = `${day}T08:10:00.000Z`;
    await prisma.timeRecord.create({
      data: {
        id: recordId,
        employeeId: testEmployeeId,
        employeeName: "Race",
        date: day,
        entrada: actual,
        status: "Laborando",
      },
    });
    await prisma.correctionRequest.create({
      data: {
        id: reqId,
        employeeId: testEmployeeId,
        timeRecordId: recordId,
        recordField: "entrada",
        originalValue: `${day}T08:00:00.000Z`,
        requestedValue: `${day}T07:50:00.000Z`,
        reason: "prueba",
      },
    });
    try {
      await expect(
        CorrectionService.updateStatus(reqId, { status: "approved" }),
      ).rejects.toMatchObject({ code: "CORRECTION_STALE" });
      expect(
        (await prisma.correctionRequest.findUniqueOrThrow({ where: { id: reqId } })).status,
      ).toBe("pending");
      expect((await prisma.timeRecord.findUniqueOrThrow({ where: { id: recordId } })).entrada).toBe(
        actual,
      );
    } finally {
      await prisma.correctionRequest.deleteMany({ where: { id: reqId } });
      await prisma.timeRecord.deleteMany({ where: { id: recordId } });
    }
  });
});
