import prisma from "../src/services/db";
import { timeRecordIntegrityService } from "../src/services/timeRecordIntegrityService";

async function run() {
  const onlyMissing = process.argv.includes("--only-missing");
  const batchSize = 250;
  let cursor: string | undefined;
  let processed = 0;

  console.log(`[integrity-backfill] Starting (onlyMissing=${onlyMissing})`);

  while (true) {
    const rows = await prisma.timeRecord.findMany({
      where: onlyMissing
        ? {
            OR: [{ integrityHash: null }, { integrityPrevHash: null }],
          }
        : undefined,
      orderBy: [{ employeeId: "asc" }, { updatedAt: "asc" }, { id: "asc" }],
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: { id: true, employeeId: true },
    });

    if (rows.length === 0) break;

    for (const row of rows) {
      await prisma.$transaction(async (tx) => {
        await timeRecordIntegrityService.sealAfterMutation(tx, row.employeeId, row.id, {
          skipAudit: true,
        });
      });
    }

    processed += rows.length;
    cursor = rows[rows.length - 1].id;
    console.log(`[integrity-backfill] Processed ${processed} records`);
  }

  console.log(`[integrity-backfill] Completed. Total processed: ${processed}`);
}

run()
  .catch((error) => {
    console.error("[integrity-backfill] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
