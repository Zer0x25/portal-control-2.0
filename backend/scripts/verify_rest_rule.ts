import { PrismaClient } from "@prisma/client";
import { shiftService } from "../src/services/shiftService";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Verificando Regla de Descanso Mínimo (8h) ===");

  try {
    const testEmail = "rest@test.com";
    const testRut = "99.999.999-R";

    // Cleanup previous test data
    const existingEmp = await prisma.employee.findFirst({ where: { email: testEmail } });
    if (existingEmp) {
      await prisma.assignedShift.deleteMany({
        where: { employeeId: existingEmp.id },
      });
      await prisma.employee.deleteMany({
        where: { id: existingEmp.id },
      });
    }

    // 1. Setup Data
    // Manually generating UUID-like ID for simplicity or letting it fail if ID is required
    // Employee model has "id String @id". It is NOT default(uuid). We must provide it.
    const empId = "test-emp-rest-rule";

    // Ensure clean state for this ID
    await prisma.assignedShift.deleteMany({ where: { employeeId: empId } });
    await prisma.employee.deleteMany({ where: { id: empId } });

    const emp = await prisma.employee.create({
      data: {
        id: empId,
        rut: testRut,
        name: "Test Rest Rule",
        email: testEmail,
        workdayType: "Artículo 22",
        position: "Tester",
        area: "QA",
      },
    });

    // Pattern A: 08:00 - 18:00 (Standard)
    const patternA = await shiftService.createPattern({
      name: "Standard Day",
      cycleLengthDays: 1,
      startDayOfWeek: 1,
      dailySchedules: [
        {
          dayIndex: 0,
          startTime: "08:00",
          endTime: "18:00",
          isOffDay: false,
          hasColacion: false,
          colacionMinutes: 0,
        },
      ],
      color: "#ffffff",
      maxHoursPattern: 10,
    });

    // Pattern B: 20:00 - 06:00 (Night Shift - Ends next day)
    const patternB = await shiftService.createPattern({
      name: "Night Shift",
      cycleLengthDays: 1,
      startDayOfWeek: 1,
      dailySchedules: [
        {
          dayIndex: 0,
          startTime: "20:00",
          endTime: "06:00",
          isOffDay: false,
          hasColacion: false,
          colacionMinutes: 0,
        },
      ],
      color: "#000000",
      maxHoursPattern: 10,
    });

    console.log("Datos de prueba creados.");

    // 2. Assign Night Shift to Day 1 (2025-05-01) -> Ends 2025-05-02 06:00
    await shiftService.assignShift(
      {
        employeeId: emp.id,
        shiftPatternId: patternB.id!, // Night
        startDate: "2025-05-01",
        endDate: "2025-05-01",
      },
      "admin",
    );
    console.log("Turno Noche asignado el 2025-05-01.");

    // 3. Try to Assign Standard Shift to Day 2 (2025-05-02) -> Starts 08:00
    // Gap: 06:00 to 08:00 = 2 hours.
    console.log("Intentando asignar Turno Día el 2025-05-02 (Brecha 2h)...");
    try {
      await shiftService.assignShift(
        {
          employeeId: emp.id,
          shiftPatternId: patternA.id!, // Standard
          startDate: "2025-05-02",
          endDate: "2025-05-02",
        },
        "admin",
      );
      console.error("❌ ERROR: El sistema permitió asignar con descanso de 2h.");
    } catch (e: any) {
      if (e.message.includes("Descanso insuficiente")) {
        console.log("✅ ÉXITO: El sistema bloqueó la asignación. Mensaje:", e.message);
      } else {
        console.error("❌ ERROR: Falló por otra razón:", e.message);
      }
    }

    // 4. Try to Assign Standard Shift to Day 3 (2025-05-03)
    // Gap from 05-02 06:00 to 05-03 08:00 is > 24h. Should succeed.
    console.log("Intentando asignar Turno Día el 2025-05-03 (Brecha amplia)...");
    await shiftService.assignShift(
      {
        employeeId: emp.id,
        shiftPatternId: patternA.id!,
        startDate: "2025-05-03",
        endDate: "2025-05-03",
      },
      "admin",
    );
    console.log("✅ ÉXITO: Asignación permitida correctamente.");
  } catch (err) {
    console.error("Error inesperado:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
