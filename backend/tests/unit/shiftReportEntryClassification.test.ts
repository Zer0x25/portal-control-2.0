import { describe, expect, it } from "vitest";
import { normalizeShiftReportEntries } from "../../src/modules/shiftReports";
import { ShiftReportSchema } from "../../src/models/schemas/report.schemas";

describe("shift report entry classification", () => {
  it("preserves visit/provider and pedestrian/vehicle classifications when normalizing entries", () => {
    const normalized = normalizeShiftReportEntries(
      "[]",
      JSON.stringify([
        {
          id: "visit-on-foot",
          time: "09:00",
          company: "Guest",
          licensePlate: "N/A",
          driverName: "Visitor",
          paxCount: 1,
          reason: "Meeting",
          timestamp: 1,
          entryType: "visit",
          arrivalMode: "pedestrian",
        },
        {
          id: "provider-by-car",
          time: "10:00",
          company: "ACME",
          licensePlate: "AB-CD-12",
          driverName: "Driver",
          paxCount: 2,
          reason: "Delivery",
          timestamp: 2,
          entryType: "provider",
          arrivalMode: "vehicle",
        },
      ]),
      0,
    );

    expect(normalized.supplierEntries).toMatchObject([
      { id: "visit-on-foot", entryType: "visit", arrivalMode: "pedestrian" },
      { id: "provider-by-car", entryType: "provider", arrivalMode: "vehicle" },
    ]);
  });

  it("accepts classified supplier entries and keeps legacy entries valid", () => {
    const report = {
      date: "2026-10-06",
      folio: "001",
      shiftName: "Day",
      responsibleUser: "Operator",
      startTime: "09:00",
      status: "open",
      logEntries: [],
      supplierEntries: [
        {
          id: "classified",
          time: "10:00",
          licensePlate: "AB-CD-12",
          driverName: "Driver",
          paxCount: 1,
          company: "ACME",
          reason: "Delivery",
          timestamp: 1,
          entryType: "provider",
          arrivalMode: "vehicle",
        },
        {
          id: "legacy",
          time: "11:00",
          licensePlate: "N/A",
          driverName: "N/A",
          paxCount: 0,
          company: "Guest",
          reason: "Meeting",
          timestamp: 2,
        },
      ],
    };

    expect(ShiftReportSchema.safeParse(report).success).toBe(true);
    expect(
      ShiftReportSchema.safeParse({
        ...report,
        supplierEntries: [{ ...report.supplierEntries[0], entryType: "employee" }],
      }).success,
    ).toBe(false);
    expect(
      ShiftReportSchema.safeParse({
        ...report,
        supplierEntries: [{ ...report.supplierEntries[0], licensePlate: "   " }],
      }).success,
    ).toBe(false);
  });
});
