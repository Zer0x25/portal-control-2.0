import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "../../src/services/db";
import { KpiService } from "../../src/services/kpiService";
import { shiftService } from "../../src/services/shiftService";
import { ulid } from "ulid";
import { KpiCache } from "../../src/services/kpi/KpiCache";

describe("KPI Integration and Metrics Layer", () => {
  const kpiService = new KpiService();
  const kpiCache = new KpiCache();
  let testEmployeeId = ulid();
  let testPatternId = ulid();

  const getOffsetDate = (offset: number) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offset);
    return d;
  };

  const getIso = (offset: number) => getOffsetDate(offset).toISOString().split("T")[0];

  beforeAll(async () => {
    // Cleanup
    await prisma.monthlyEmployeeStats.deleteMany({});
    await prisma.systemConfig.deleteMany({ where: { key: "accounting_lock_date" } });

    // Setup Employee
    await prisma.employee.create({
      data: {
        id: testEmployeeId,
        name: "KPI Analysis Tester",
        rut: `KPI-${ulid().slice(0, 10)}`,
        position: "Manager",
        area: "Finance",
        workdayType: "Normal",
        status: "Activo",
      },
    });

    // Setup Shift Pattern (9h worked hours, 10h span)
    await shiftService.createPattern({
      id: testPatternId,
      name: "Standard 9h Pattern",
      cycleLengthDays: 14, // Force exception to avoid 6x1 during tests
      startDayOfWeek: 0,
      color: "#333",
      maxHoursPattern: 45,
      dailySchedules: Array.from({ length: 14 }).map((_, i) => ({
        dayIndex: i,
        isOffDay: i >= 7,
        startTime: i < 7 ? "08:00" : null,
        endTime: i < 7 ? "18:00" : null,
        hours: i < 7 ? 9.0 : 0,
        hasColacion: true,
        colacionMinutes: 60,
      })),
    });

    await shiftService.assignShift(
      {
        employeeId: testEmployeeId,
        shiftPatternId: testPatternId,
        startDate: getIso(-6),
        endDate: null,
      },
      "admin",
    );
  });

  afterAll(async () => {
    await prisma.assignedShift.deleteMany({ where: { employeeId: testEmployeeId } });
    await prisma.timeRecord.deleteMany({ where: { employeeId: testEmployeeId } });
    await prisma.shiftPattern.deleteMany({ where: { id: testPatternId } });
    await prisma.employee.delete({ where: { id: testEmployeeId } });
  });

  it("should calculate correct KPIs for a standard workday (Worked vs Scheduled)", async () => {
    const testDateIso = getIso(-4);
    // 08:00 - 18:00 = 10h total. 1h colacion = 9h worked.
    await prisma.timeRecord.create({
      data: {
        employeeId: testEmployeeId,
        employeeName: "KPI Analysis Tester",
        date: testDateIso,
        entrada: `${testDateIso}T08:00:00Z`,
        salida: `${testDateIso}T18:00:00Z`,
        status: "Completado",
        source: "TEST_SUITE",
      },
    });

    const report = await kpiService.getDetailedReport({
      startDate: testDateIso,
      endDate: testDateIso,
      employeeIds: [testEmployeeId],
    });

    const stats = report.summary[0];
    expect(stats.totalHoursWorked).toBe(9.0);
    expect(stats.totalHoursScheduled).toBe(9.0);
  });

  it("should calculate overtime correctly when exceeding scheduled hours", async () => {
    const testDateIso = getIso(-3);
    // 08:00 - 19:00 = 11h total. 1h colacion = 10h worked. 1h Overtime.
    await prisma.timeRecord.create({
      data: {
        employeeId: testEmployeeId,
        employeeName: "KPI Analysis Tester",
        date: testDateIso,
        entrada: `${testDateIso}T08:00:00Z`,
        salida: `${testDateIso}T19:00:00Z`,
        status: "Completado",
        source: "TEST_SUITE",
      },
    });

    const kpis = (await kpiService.getKpiSummary({
      startDate: getIso(-6),
      endDate: getIso(0),
      employeeIds: [testEmployeeId],
    })) as any;

    // 9 (Mon) + 10 (Tue) = 19 worked.
    expect(kpis.kpis.totalWorkedHours).toBe(19.0);
    expect(kpis.kpis.totalOvertimeHours).toBe(1.0);
  });

  it("should neutralize overtime for shifts scheduled >= 11h (Industrial Rule)", async () => {
    const longEmpId = ulid();
    const longPatternId = ulid();

    await prisma.employee.create({
      data: {
        id: longEmpId,
        name: "Long Shift Tester",
        rut: `LONG-${ulid().slice(0, 10)}`,
        position: "Security",
        area: "Security",
        workdayType: "Normal",
        status: "Activo",
      },
    });

    await prisma.shiftPattern.create({
      data: {
        id: longPatternId,
        name: "Long 12h Pattern",
        cycleLengthDays: 14,
        startDayOfWeek: 0,
        color: "#000",
        maxHoursPattern: 60,
        dailySchedules: JSON.stringify(
          Array.from({ length: 14 }).map((_, i) => ({
            dayIndex: i,
            isOffDay: i >= 7,
            startTime: i < 7 ? "08:00" : null,
            endTime: i < 7 ? "20:00" : null,
            hours: i < 7 ? 12.0 : 0,
            hasColacion: true,
            colacionMinutes: 0,
          })),
        ),
      },
    });

    await shiftService.assignShift(
      {
        employeeId: longEmpId,
        shiftPatternId: longPatternId,
        startDate: getIso(-5),
        endDate: null,
      },
      "admin",
    );

    const testDateIso = getIso(-2);
    await prisma.timeRecord.create({
      data: {
        employeeId: longEmpId,
        employeeName: "Long Shift Tester",
        date: testDateIso,
        entrada: `${testDateIso}T08:00:00Z`,
        salida: `${testDateIso}T21:00:00Z`,
        status: "Completado",
        source: "TEST_SUITE",
      },
    });

    const report = await kpiService.getDetailedReport({
      startDate: testDateIso,
      endDate: testDateIso,
      employeeIds: [longEmpId],
    });

    const dayDetail = report.details[longEmpId][0];
    expect(dayDetail.workedHours).toBe(13.0);
    expect(dayDetail.overtime).toBe(0.0);

    // Cleanup
    await prisma.assignedShift.deleteMany({ where: { employeeId: longEmpId } });
    await prisma.timeRecord.deleteMany({ where: { employeeId: longEmpId } });
    await prisma.shiftPattern.delete({ where: { id: longPatternId } });
    await prisma.employee.delete({ where: { id: longEmpId } });
  });

  it("should handle Article 22 by zeroing scheduled/overtime hours", async () => {
    await prisma.employee.update({
      where: { id: testEmployeeId },
      data: { workdayType: "Artículo 22" },
    });

    const testDateIso = getIso(-1);
    await prisma.timeRecord.create({
      data: {
        employeeId: testEmployeeId,
        employeeName: "KPI Analysis Tester",
        date: testDateIso,
        entrada: `${testDateIso}T08:00:00Z`,
        salida: `${testDateIso}T18:00:00Z`,
        status: "Completado",
        source: "TEST_SUITE",
      },
    });

    const report = await kpiService.getDetailedReport({
      startDate: testDateIso,
      endDate: testDateIso,
      employeeIds: [testEmployeeId],
    });

    const stats = report.summary[0];
    expect(stats.totalHoursWorked).toBe(0.0);
    expect(stats.totalHoursScheduled).toBe(0.0);

    await prisma.employee.update({
      where: { id: testEmployeeId },
      data: { workdayType: "Normal" },
    });
  });

  it("should use monthly cache when a month is locked", async () => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const nextMonthIso = nextMonth.toISOString().split("T")[0];

    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthStartIso = currentMonthStart.toISOString().split("T")[0];
    const currentMonthEndIso = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];
    const assignmentStart = getOffsetDate(-6);
    const searchStart = assignmentStart > currentMonthStart ? assignmentStart : currentMonthStart;
    const testDate = new Date(searchStart);
    const cycleStart = assignmentStart.getTime();

    // Find the first scheduled workday in the current month for the assigned 14-day pattern (7 on, 7 off).
    while (testDate.toISOString().split("T")[0] <= currentMonthEndIso) {
      const diffDays = Math.floor((testDate.getTime() - cycleStart) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays % 14 < 7) {
        break;
      }
      testDate.setDate(testDate.getDate() + 1);
    }

    const testDateIso = testDate.toISOString().split("T")[0];

    // Ensure we have a clean record for this specific day in the current month
    await prisma.timeRecord.deleteMany({
      where: { employeeId: testEmployeeId, date: testDateIso },
    });
    await prisma.timeRecord.create({
      data: {
        employeeId: testEmployeeId,
        employeeName: "KPI Analysis Tester",
        date: testDateIso,
        entrada: `${testDateIso}T08:00:00Z`,
        salida: `${testDateIso}T18:00:00Z`,
        status: "Completado",
        source: "TEST_SUITE",
      },
    });

    // 1. Lock first to force cache generation on first access
    await prisma.systemConfig.upsert({
      where: { key: "accounting_lock_date" },
      update: { value: JSON.stringify(nextMonthIso) },
      create: { key: "accounting_lock_date", value: JSON.stringify(nextMonthIso) },
    });

    // 2. Initial access to generate and persist cache
    await kpiService.getKpiSummary({
      startDate: currentMonthStartIso,
      endDate: currentMonthEndIso,
      employeeIds: [testEmployeeId],
    });

    // 3. Alter a record (Live data change)
    await prisma.timeRecord.updateMany({
      where: { employeeId: testEmployeeId, date: testDateIso },
      data: { entrada: `${testDateIso}T16:00:00Z` },
    });

    // 4. Request again - should return the cached 9.0 hours
    const report = await kpiService.getDetailedReport({
      startDate: currentMonthStartIso,
      endDate: currentMonthEndIso,
      employeeIds: [testEmployeeId],
    });

    const targetStat = report.details[testEmployeeId].find((d) => d.isoDate === testDateIso);
    expect(targetStat).toBeDefined();
    expect(targetStat?.workedHours).toBe(9.0);

    // 5. Cleanup lock date specifically for this test case
    await prisma.systemConfig.deleteMany({ where: { key: "accounting_lock_date" } });
  });
});
