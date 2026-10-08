import { prismaDirect, withDirectTransaction, closeDatabase } from "../src/services/db";
import { logger } from "../src/utils/logger";

async function main() {
  const args = process.argv.slice(2);
  if (
    args.some((arg) => !["--status", "--recover", "--confirm-all-runtimes-stopped"].includes(arg))
  )
    throw new Error("Unknown argument");
  if (args.includes("--recover")) {
    if (!args.includes("--confirm-all-runtimes-stopped"))
      throw new Error(
        "Stop every runtime AND external backup/restore motor, then pass --confirm-all-runtimes-stopped",
      );
    await withDirectTransaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM portal_runtime.gate WHERE id = 1 FOR UPDATE`;
      await tx.$executeRaw`UPDATE portal_runtime.gate SET maintenance_permit = NULL, operation = NULL WHERE id = 1`;
      const removed = await tx.$executeRaw`DELETE FROM portal_runtime.permits`;
      logger.info("Offline runtime coordination recovery", { removed });
    });
  }
  const gate =
    await prismaDirect.$queryRaw`SELECT operation, maintenance_permit FROM portal_runtime.gate`;
  const permits =
    await prismaDirect.$queryRaw`SELECT id, owner, label, created_at FROM portal_runtime.permits ORDER BY created_at`;
  const locks =
    await prismaDirect.$queryRaw`SELECT key, permit_id, created_at FROM portal_runtime.locks ORDER BY created_at`;
  logger.info("Runtime coordination status", { gate, permits, locks });
}
main()
  .catch((error) => {
    logger.error("Runtime coordination command failed", error);
    process.exitCode = 1;
  })
  .finally(closeDatabase);
