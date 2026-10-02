import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ulid } from "ulid";
import prisma from "../../src/services/db";
import { TimeRecordService } from "../../src/services/TimeRecordService";

describe("TimeRecord anomaly correction and filtering flow", () => {
  const employeeId = ulid();
  const username = `it_anomaly_${ulid().toLowerCase()}`;
  let recordId = "";

  beforeAll(async () => {
    await prisma.employee.create({
      data: {
        id: employeeId,
        name: "Anomaly Flow Employee",
        rut: `33${Date.now()}-3`,
        position: "Operator",
        area: "Ops",
        workdayType: "Normal",
        status: "Activo",
      },
    });
  });

  afterAll(async () => {
    if (recordId) {
      await prisma.timeRecord.deleteMany({ where: { id: recordId } });
    }
    await prisma.employee.deleteMany({ where: { id: employeeId } });
  });

  it("removes corrected record from anomaly filter after manual timestamp correction", async () => {
    const businessDate = "2026-03-01";
    const entrada = "2026-03-01T08:00:00.000Z";

    const created = await prisma.timeRecord.create({
      data: {
        employeeId,
        employeeName: "Anomaly Flow Employee",
        employeePosition: "Operator",
        employeeArea: "Ops",
        employeeWorkdayType: "Normal",
        date: businessDate,
        entrada,
        status: "SinMarcajeTurnoAsignado",
        source: "TEST_SUITE",
      },
    });

    recordId = created.id;

    const anomaliesBefore = await TimeRecordService.listRecords({
      desde: businessDate,
      hasta: businessDate,
      showAnomalies: true,
      pageSize: -1,
    });

    expect(anomaliesBefore.data.some((r: { id: string }) => r.id === recordId)).toBe(true);

    const corrected = await TimeRecordService.saveRecord(
      {
        id: recordId,
        employeeId,
        employeeName: "Anomaly Flow Employee",
        employeePosition: "Operator",
        employeeArea: "Ops",
        employeeWorkdayType: "Normal",
        date: businessDate,
        entrada,
        salida: "2026-03-01T17:00:00.000Z",
        status: "SinMarcajeTurnoAsignado",
        source: "WEB",
      },
      username,
    );

    expect(corrected.status).toBe("Completado");

    const anomaliesAfter = await TimeRecordService.listRecords({
      desde: businessDate,
      hasta: businessDate,
      showAnomalies: true,
      pageSize: -1,
    });

    expect(anomaliesAfter.data.some((r: { id: string }) => r.id === recordId)).toBe(false);
  });

  it("rejects manual correction when salida exceeds 12 hours from entrada", async () => {
    const businessDate = "2026-03-02";
    const created = await prisma.timeRecord.create({
      data: {
        employeeId,
        employeeName: "Anomaly Flow Employee",
        employeePosition: "Operator",
        employeeArea: "Ops",
        employeeWorkdayType: "Normal",
        date: businessDate,
        entrada: "2026-03-02T08:00:00.000Z",
        status: "AnomaliaManual",
        source: "TEST_SUITE",
      },
    });

    try {
      await expect(
        TimeRecordService.saveRecord(
          {
            id: created.id,
            employeeId,
            employeeName: "Anomaly Flow Employee",
            employeePosition: "Operator",
            employeeArea: "Ops",
            employeeWorkdayType: "Normal",
            date: businessDate,
            entrada: "2026-03-02T08:00:00.000Z",
            salida: "2026-03-02T21:30:00.000Z",
            status: "AnomaliaManual",
            source: "WEB",
          },
          username,
        ),
      ).rejects.toMatchObject({ code: "SHIFT_LENGTH_LIMIT_EXCEEDED" });
    } finally {
      await prisma.timeRecord.deleteMany({ where: { id: created.id } });
    }
  });

  it("rejects manual correction when colacion sequence is inconsistent", async () => {
    const businessDate = "2026-03-03";
    const created = await prisma.timeRecord.create({
      data: {
        employeeId,
        employeeName: "Anomaly Flow Employee",
        employeePosition: "Operator",
        employeeArea: "Ops",
        employeeWorkdayType: "Normal",
        date: businessDate,
        entrada: "2026-03-03T08:00:00.000Z",
        inicioColacion: "2026-03-03T13:00:00.000Z",
        status: "AnomaliaManual",
        source: "TEST_SUITE",
      },
    });

    try {
      await expect(
        TimeRecordService.saveRecord(
          {
            id: created.id,
            employeeId,
            employeeName: "Anomaly Flow Employee",
            employeePosition: "Operator",
            employeeArea: "Ops",
            employeeWorkdayType: "Normal",
            date: businessDate,
            entrada: "2026-03-03T08:00:00.000Z",
            inicioColacion: "2026-03-03T13:00:00.000Z",
            finColacion: "2026-03-03T12:45:00.000Z",
            status: "AnomaliaManual",
            source: "WEB",
          },
          username,
        ),
      ).rejects.toMatchObject({ code: "INVALID_TIME_RECORD_SEQUENCE" });
    } finally {
      await prisma.timeRecord.deleteMany({ where: { id: created.id } });
    }
  });
});
