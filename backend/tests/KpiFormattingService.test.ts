import { describe, expect, it } from "vitest";
import { KpiFormattingService } from "../src/services/kpi/KpiFormattingService";

describe("KpiFormattingService", () => {
  it("calculates and rounds summary rates", () => {
    const service = new KpiFormattingService();
    const result = service.buildSummaryResponse(
      {
        totalWorkedHours: 100,
        totalOvertimeHours: 12,
        totalScheduledWorkdays: 20,
        tardinessCount: 3,
        absenceCount: 2,
        vacationCount: 1,
        medicalLeaveCount: 1,
        specialPermitCount: 0,
      },
      {
        tardyRecords: [],
        absentEmployees: [],
        vacationRecords: [],
        medicalLeaveRecords: [],
        specialPermitRecords: [],
      },
      "2026-01-01",
      "2026-01-31",
      5,
    );

    expect(result.kpis.tardinessRate).toBe(15);
    expect(result.kpis.unjustifiedAbsenceRate).toBe(10);
    expect(result.kpis.justifiedAbsenceRate).toBe(10);
    expect(result.kpis.totalAbsenteeismRate).toBe(20);
    expect(result.kpis.overtimePercentage).toBe(12);
  });

  it("builds detailed report including employee with no worked days", () => {
    const service = new KpiFormattingService();
    const result = service.buildDetailedReport(
      [{ id: "e1", name: "No Work" } as any],
      [
        {
          workedHours: 0,
          overtimeHours: 0,
          scheduledWorkdays: 2,
          tardinessCount: 0,
          absenceCount: 2,
          vacationDays: 0,
          medicalLeaveDays: 0,
          details: [
            { scheduledHours: 8, workedHours: 0 } as any,
            { scheduledHours: 8, workedHours: 0 } as any,
          ],
        },
      ],
    );

    expect(result.summary[0].totalHoursWorked).toBe(0);
    expect(result.summary[0].workedDays).toBe(0);
    expect(result.summary[0].totalHoursScheduled).toBe(16);
    expect(result.details.e1).toHaveLength(2);
  });
});
