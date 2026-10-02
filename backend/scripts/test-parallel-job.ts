import prisma from "../src/services/db";
import { seedingJobService } from "../src/services/seedingJobService";

async function main() {
  console.log("=== Testing Parallel Seeding Job ===");

  // 1. Prerequisites check
  const empCount = await prisma.employee.count();
  if (empCount === 0) {
    console.error("❌ No employees. Run phase 1 first.");
    return;
  }

  // 2. Create a Job
  const DAYS = 15; // 3 parallel chunks of 5
  console.log(`Starting Job for ${DAYS} days...`);

  const startTime = Date.now();
  const job = await seedingJobService.startPhase2("PERF_TEST_USER", {
    days: DAYS,
    leaveRatio: 5,
    correctionRequestRatio: 2,
  });

  console.log(`Job Created: ${job.id}. Status: ${job.status}`);

  // 3. Monitor Job
  return new Promise<void>((resolve, reject) => {
    const interval = setInterval(async () => {
      const current = await prisma.seedingJob.findUnique({ where: { id: job.id } });
      if (!current) {
        clearInterval(interval);
        reject("Job lost");
        return;
      }

      const prog = current.progress as any;
      process.stdout.write(
        `\rProgress: ${prog?.currentDay || 0}/${DAYS} days | Records: ${prog?.processedRecords || 0} | Status: ${current.status}   `,
      );

      if (current.status === "completed" || current.status === "failed") {
        clearInterval(interval);
        const duration = (Date.now() - startTime) / 1000;
        console.log(`\n\nJob finished in ${duration}s with status: ${current.status}`);

        if (current.status === "failed") {
          console.error(`Error: ${current.errorSummary}`);
        }

        // Verify some records were created
        const recordCount = await prisma.timeRecord.count();
        console.log(`Total TimeRecords in DB: ${recordCount}`);

        resolve();
      }
    }, 1000);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
