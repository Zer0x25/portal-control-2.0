import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("--- Listado de Patrones y su Uso ---");
  try {
    const patterns = await prisma.shiftPattern.findMany({
      take: 10,
    });

    for (const p of patterns) {
      const assCount = await prisma.assignedShift.count({ where: { shiftPatternId: p.id } });
      const recCount = await prisma.timeRecord.count({ where: { shiftPatternId: p.id } });
      console.log(`Pattern: ${p.name} (${p.id}) -> Assignments: ${assCount}, Records: ${recCount}`);
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
