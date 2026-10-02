import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testDelete(id: string) {
  console.log(`--- Testing deletion for: ${id} ---`);
  try {
    // 1. Conflict Check (Logic from controller)
    const activeAssignmentsCount = await prisma.assignedShift.count({
      where: { shiftPatternId: id },
    });

    if (activeAssignmentsCount > 0) {
      console.log(`CONFLICTO DETECTADO: El patrón tiene ${activeAssignmentsCount} asignaciones.`);
      return;
    }

    // 2. Deletion
    try {
      await prisma.shiftPattern.delete({ where: { id } });
      console.log("EXITO: Patrón eliminado.");
    } catch (e: any) {
      if (e.code === "P2025") {
        console.log("EXITO (Silencioso): El patrón no existía, se considera eliminado.");
      } else {
        throw e;
      }
    }
  } catch (error: any) {
    console.error("FALLO INESPERADO:", error);
  }
}

async function main() {
  // 1. Case: Pattern with conflicts
  await testDelete("01KGHXQYJRZ0P358F52T4ZY2P2K");

  // 2. Case: Non-existent pattern
  await testDelete("non-existent-uuid-123");

  // 3. Case: Clean pattern (create one then delete it)
  const temp = await prisma.shiftPattern.create({
    data: {
      name: "Temp Test Pattern",
      cycleLengthDays: 1,
      dailySchedules: "[]",
    },
  });
  console.log(`Created temp pattern: ${temp.id}`);
  await testDelete(temp.id);

  await prisma.$disconnect();
}

main();
