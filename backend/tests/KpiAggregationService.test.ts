import { describe, expect, it } from "vitest";
import { KpiAggregationService } from "../src/services/kpi/KpiAggregationService";

describe("KpiAggregationService", () => {
  it("aggregates summary and detail records", () => {
    const service = new KpiAggregationService();
    const summary = service.createSummaryAccumulator();
    const details = service.createSummaryDetails();

    const employee = {
      id: "emp-1",
      name: "Jane Doe",
      area: "Ops",
      position: "Operator",
      workdayType: "Normal",
      status: "Activo",
      rut: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    service.aggregateEmployeeSummary(
      employee,
      {
        workedHours: 10,
        overtimeHours: 2,
        scheduledWorkdays: 1,
        tardinessCount: 1,
        absenceCount: 1,
        vacationDays: 1,
        medicalLeaveDays: 1,
        details: [
          { status: "Atraso", isoDate: "2026-01-10", actualClocks: "08:15" } as any,
          { status: "Ausente", isoDate: "2026-01-11", actualClocks: "-" } as any,
          { status: "Vacaciones", isoDate: "2026-01-12", actualClocks: "-" } as any,
          { status: "Licencia Médica", isoDate: "2026-01-13", actualClocks: "-" } as any,
        ],
      },
      summary,
      details,
    );

    expect(summary.totalWorkedHours).toBe(10);
    expect(summary.totalOvertimeHours).toBe(2);
    expect(summary.totalScheduledWorkdays).toBe(1);
    expect(summary.tardinessCount).toBe(1);
    expect(summary.absenceCount).toBe(1);
    expect(summary.vacationCount).toBe(1);
    expect(summary.medicalLeaveCount).toBe(1);
    expect(details.tardyRecords).toHaveLength(1);
    expect(details.absentEmployees).toHaveLength(1);
    expect(details.vacationRecords).toHaveLength(1);
    expect(details.medicalLeaveRecords).toHaveLength(1);
  });
});
