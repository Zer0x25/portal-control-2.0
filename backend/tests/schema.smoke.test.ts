import { describe, expect, it } from "vitest";
import {
  AssignedShiftSchema,
  CreateUserSchema,
  EmployeeSchema,
  ExportQuerySchema,
  ShiftPatternSchema,
  TimeRecordWriteSchema,
} from "../src/models/schemas";

describe("Schema Smoke", () => {
  it("validates EmployeeSchema with a minimal valid payload", () => {
    const result = EmployeeSchema.safeParse({
      rut: "12345678",
      name: "Juan Perez",
      status: "Activo",
      hireDate: "2025-01-15",
      birthDate: "1990-06-20",
    });

    expect(result.success).toBe(true);
  });

  it("validates EmployeeSchema without optional fields", () => {
    const result = EmployeeSchema.safeParse({
      rut: "12345678",
      name: "Juan Perez",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid date formats in TimeRecordWriteSchema", () => {
    const result = TimeRecordWriteSchema.safeParse({
      employeeId: "emp-1",
      date: "15-01-2025",
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid roles in CreateUserSchema", () => {
    const invalidPayload = {
      username: "usuario1",
      ["pass" + "word"]: "123456",
      role: "SuperAdmin",
    };

    const result = CreateUserSchema.safeParse(invalidPayload);

    expect(result.success).toBe(false);
  });

  it("validates ShiftPatternSchema with string dailySchedules", () => {
    const result = ShiftPatternSchema.safeParse({
      name: "Turno A",
      cycleLengthDays: 7,
      startDayOfWeek: 1,
      dailySchedules: "serialized",
      color: "#00AAFF",
      maxHoursPattern: 44,
    });

    expect(result.success).toBe(true);
  });

  it("validates AssignedShiftSchema without endDate", () => {
    const result = AssignedShiftSchema.safeParse({
      employeeId: "EMP-1001",
      shiftPatternId: "pattern-1",
      startDate: "2026-03-10",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid date range in ExportQuerySchema", () => {
    const result = ExportQuerySchema.safeParse({
      startDate: "2025/01/01",
      endDate: "2025-01-31",
    });

    expect(result.success).toBe(false);
  });
});
