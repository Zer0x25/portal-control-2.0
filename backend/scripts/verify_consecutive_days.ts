import { PrismaClient } from "@prisma/client";
import { shiftService } from "../src/services/shiftService";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Verificando Regla de 6 Días Consecutivos ===");

  const email = "consecutive@test.com";
  const empId = "test-emp-consecutive";

  try {
    // Cleanup
    await prisma.assignedShift.deleteMany({ where: { employeeId: empId } });
    await prisma.employee.deleteMany({ where: { id: empId } });

    // 1. Create Employee (Article 22 to bypass weekly hours check)
    const emp = await prisma.employee.create({
      data: {
        id: empId,
        rut: "88.888.888-K",
        name: "Test Consecutive",
        email: email,
        workdayType: "Artículo 22",
        position: "Tester",
        area: "QA",
      },
    });

    // 2. Create Pattern 1: Continuous Work (1 day cycle, work)
    // Named "Continuous" - NOT exceptional
    const patternContinuous = await shiftService.createPattern({
      name: "Continuous Work",
      cycleLengthDays: 1,
      startDayOfWeek: 1,
      dailySchedules: [
        {
          dayIndex: 0,
          startTime: "09:00",
          endTime: "18:00",
          isOffDay: false,
          hasColacion: false,
          colacionMinutes: 0,
        },
      ],
      color: "#ff0000",
      maxHoursPattern: 45,
    });

    // 3. Create Pattern 2: 7x7 (Exceptional)
    // Named "Turno 7x7" - Should be exceptional by name
    const pattern7x7 = await shiftService.createPattern({
      name: "Turno 7x7 Excepcional",
      cycleLengthDays: 14,
      startDayOfWeek: 1,
      dailySchedules: Array.from({ length: 14 }, (_, i) => ({
        dayIndex: i,
        startTime: i < 7 ? "08:00" : undefined,
        endTime: i < 7 ? "20:00" : undefined,
        isOffDay: i >= 7,
        hasColacion: false,
        colacionMinutes: 0,
      })),
      color: "#00ff00",
      maxHoursPattern: 84,
    });

    // TEST 1: Assign 7 consecutive days of Continuous -> Should FAIL
    console.log("\nTest 1: Asignar 7 días continuos (No Excepcional)...");
    try {
      await shiftService.assignShift(
        {
          employeeId: emp.id,
          shiftPatternId: patternContinuous.id!,
          startDate: "2025-06-01", // Mon
          endDate: "2025-06-07", // Sun (7 days)
        },
        "admin",
      );
      console.error("❌ ERROR: El sistema permitió asignar 7 días seguidos.");
    } catch (e: any) {
      if (e.message.includes("Regla 6x1 excedida")) {
        console.log("✅ ÉXITO: Bloqueado correctamente:", e.message);
      } else {
        console.error("❌ ERROR: Falló por otra razón:", e.message);
      }
    }

    // TEST 2: Assign 6 consecutive days -> Should SUCCEED
    console.log("\nTest 2: Asignar 6 días continuos...");
    try {
      await shiftService.assignShift(
        {
          employeeId: emp.id,
          shiftPatternId: patternContinuous.id!,
          startDate: "2025-06-10",
          endDate: "2025-06-15", // 6 days
        },
        "admin",
      );
      console.log("✅ ÉXITO: Asignación de 6 días permitida.");
    } catch (e: any) {
      console.error("❌ ERROR: Falló asignación válida:", e.message);
    }

    // TEST 3: Assign 7x7 (7 days work) -> Should SUCCEED (Exception)
    console.log("\nTest 3: Asignar Patrón 7x7 (7 días trabajo)...");
    try {
      await shiftService.assignShift(
        {
          employeeId: emp.id,
          shiftPatternId: pattern7x7.id!,
          startDate: "2025-07-01",
          endDate: "2025-07-14",
        },
        "admin",
      );
      console.log("✅ ÉXITO: Patrón 7x7 permitido.");
    } catch (e: any) {
      console.error("❌ ERROR: Patrón 7x7 bloqueado incorrectamente:", e.message);
    }
  } catch (err) {
    console.error("Error inesperado:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
