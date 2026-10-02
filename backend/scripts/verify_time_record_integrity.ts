import prisma from "../src/services/db";
import { timeRecordIntegrityService } from "../src/services/timeRecordIntegrityService";

async function run() {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number.parseInt(limitArg.split("=")[1] ?? "20000", 10) : 20000;

  const result = await timeRecordIntegrityService.verifyChain(prisma as any, { limit });
  const byReason = result.broken.reduce<Record<string, number>>((acc, item) => {
    acc[item.reason] = (acc[item.reason] ?? 0) + 1;
    return acc;
  }, {});

  console.log(
    JSON.stringify(
      {
        checked: result.checkedCount,
        broken: result.brokenCount,
        byReason,
      },
      null,
      2,
    ),
  );
}

run()
  .catch((error) => {
    console.error("[integrity-verify] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
