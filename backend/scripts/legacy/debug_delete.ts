import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const id = "00739e99-e408-4749-b9af-3b3e9bb351b7";
  console.log(`Intentando eliminar patrón: ${id}`);

  try {
    // Check for assignments first
    const assignments = await prisma.assignedShift.findMany({
      where: { shiftPatternId: id },
    });

    if (assignments.length > 0) {
      console.log(`CONFLICTO: Hay ${assignments.length} asignaciones usando este patrón.`);
    } else {
      console.log("No se encontraron asignaciones para este patrón.");
    }

    const records = await prisma.timeRecord.findMany({
      where: { shiftPatternId: id },
    });

    if (records.length > 0) {
      console.log(`CONFLICTO: Hay ${records.length} registros de tiempo usando este patrón.`);
    } else {
      console.log("No se encontraron registros de tiempo para este patrón.");
    }

    // Try deletion
    await prisma.shiftPattern.delete({ where: { id } });
    console.log("Patrón eliminado exitosamente.");
  } catch (error: any) {
    console.error("ERROR AL ELIMINAR:", error.code, error.message);
    if (error.code === "P2003") {
      console.error("Detalle: Error de clave foránea (Foreign Key Constraint)");
    } else if (error.code === "P2025") {
      console.error("Detalle: Registro no encontrado");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
