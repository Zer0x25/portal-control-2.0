/**
 * Quick test: run seedHistoryForDate for 1 day and inspect generated records.
 * Usage: npx ts-node scripts/test-phase2.ts
 */
import prisma from "../src/services/db";
import { seedingEngine as seedingService } from "../src/services/seeder/SeederEngine";

async function main() {
  console.log("=== Phase 2 Quick Test ===\n");

  // 1. Check prerequisites
  const empCount = await prisma.employee.count();
  const patternCount = await prisma.shiftPattern.count();
  const assignmentCount = await prisma.assignedShift.count();
  console.log(`Employees: ${empCount}`);
  console.log(`ShiftPatterns: ${patternCount}`);
  console.log(`AssignedShifts: ${assignmentCount}`);

  if (empCount === 0) {
    console.error("\n❌ No employees found. Run Phase 1 first.");
    process.exit(1);
  }
  if (assignmentCount === 0) {
    console.error("\n❌ No shift assignments found. Phase 1 may not have completed properly.");
    process.exit(1);
  }

  // 2. Pick yesterday as target date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const dateStr = yesterday.toISOString().split("T")[0];
  console.log(`\nTarget date: ${dateStr} (day of week: ${yesterday.getDay()})`);

  // 3. Check if records already exist for that date
  const existing = await prisma.timeRecord.count({ where: { date: dateStr } });
  console.log(`Existing records for ${dateStr}: ${existing}`);

  if (existing > 0) {
    console.log("Deleting existing records to re-test...");
    await prisma.timeRecord.deleteMany({ where: { date: dateStr } });
  }

  // 4. Run seedHistoryForDate
  console.log("\nRunning seedHistoryForDate...");
  const count = await seedingService.seedHistoryForDate(yesterday, 0.05, (msg) =>
    console.log(`  ${msg}`),
  );
  console.log(`\nGenerated: ${count} records`);

  // 5. Inspect a sample of generated records
  const samples = await prisma.timeRecord.findMany({
    where: { date: dateStr },
    take: 10,
    select: {
      id: true,
      employeeName: true,
      date: true,
      entrada: true,
      inicioColacion: true,
      finColacion: true,
      salida: true,
      status: true,
      scheduledStartTime: true,
      scheduledEndTime: true,
      shiftPatternName: true,
    },
  });

  console.log("\n=== Sample Records ===");
  for (const r of samples) {
    console.log(
      `  ${r.employeeName} | ${r.date} | entrada=${r.entrada ?? "NULL"} | colacion=${r.inicioColacion ?? "NULL"}-${r.finColacion ?? "NULL"} | salida=${r.salida ?? "NULL"} | status=${r.status} | shift=${r.shiftPatternName ?? "none"} | sched=${r.scheduledStartTime}-${r.scheduledEndTime}`,
    );
  }

  // 6. Stats
  const stats = await prisma.timeRecord.groupBy({
    by: ["status"],
    where: { date: dateStr },
    _count: true,
  });
  console.log("\n=== Status Distribution ===");
  for (const s of stats) {
    console.log(`  ${s.status}: ${s._count}`);
  }

  const withEntry = await prisma.timeRecord.count({
    where: { date: dateStr, entrada: { not: null } },
  });
  const withExit = await prisma.timeRecord.count({
    where: { date: dateStr, salida: { not: null } },
  });
  console.log(`\n  Records with entrada: ${withEntry}/${count}`);
  console.log(`  Records with salida: ${withExit}/${count}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
