import prisma from "../src/services/db";

async function main() {
  const byStatus = await prisma.timeRecord.groupBy({ by: ["status"], _count: true });
  console.log("=== TimeRecord Status Distribution ===");
  for (const s of byStatus) console.log(`  ${s.status}: ${s._count}`);

  const corrections = await prisma.correctionRequest.count();
  console.log(`\nCorrection Requests: ${corrections}`);

  // Check if "Completado" records exist
  const completado = await prisma.timeRecord.count({ where: { status: "Completado" } });
  const cerrado = await prisma.timeRecord.count({ where: { status: "Cerrado" } });
  console.log(`\n  "Completado" records: ${completado}`);
  console.log(`  "Cerrado" records: ${cerrado}`);

  if (completado === 0 && cerrado > 0) {
    console.log(
      '\n⚠️  seedCorrectionRequests filters by "Completado" but Phase 2 seeds "Cerrado"!',
    );
    console.log("   This means ZERO candidates are found → ZERO corrections generated.");
  }

  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
