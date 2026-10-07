import { expect, it } from "vitest";
import { KpiAggregationService } from "../../src/services/kpi/KpiAggregationService";
it("omits employee PIN from a concrete absence detail", () => {
  const aggregation = new KpiAggregationService();
  const summary = aggregation.createSummaryAccumulator();
  const details = aggregation.createSummaryDetails();
  aggregation.aggregateEmployeeSummary(
    {
      id: "emp",
      name: "Employee",
      rut: "123",
      email: null,
      position: "Operator",
      area: "Ops",
      workdayType: "Ordinaria",
      status: "Activo",
      pin: "secret-pin",
      isPinBlocked: false,
      pinFailedAttempts: 0,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    },
    {
      workedHours: 0,
      overtimeHours: 0,
      scheduledWorkdays: 1,
      tardinessCount: 0,
      absenceCount: 1,
      vacationDays: 0,
      medicalLeaveDays: 0,
      details: [
        {
          date: "1/1/2026",
          isoDate: "2026-01-01",
          dayOfWeek: "Jueves",
          scheduledShift: "09:00 - 17:00",
          actualClocks: "Sin Marcaje",
          scheduledHours: 8,
          workedHours: 0,
          overtime: 0,
          colacionMinutes: 0,
          differenceHours: -8,
          isHoliday: false,
          status: "Ausente",
        },
      ],
    },
    summary,
    details,
  );
  expect(details.absentEmployees).toHaveLength(1);
  expect(details.absentEmployees[0]).toMatchObject({ id: "emp", absenceDate: "2026-01-01" });
  expect(details.absentEmployees[0]).not.toHaveProperty("pin");
  expect(summary.absenceCount).toBe(1);
});
