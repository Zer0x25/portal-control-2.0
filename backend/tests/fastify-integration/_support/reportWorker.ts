import { ExportService } from "../../../src/services/export/ExportService";
import { EmailService } from "../../../src/services/EmailService";
import prisma, { closeDatabase } from "../../../src/services/db";
import { assertConnectedToTestDb } from "../../integration/_support/testDb";

async function main() {
  await assertConnectedToTestDb();
  ExportService.prototype.generateReportPDF = async () => Buffer.from("%PDF-test-fixture");
  EmailService.prototype.sendEmailWithAttachment = async () => {
    process.send?.({ type: "delivery" });
    return { success: true, message: "fixture" };
  };
  const read = prisma.scheduledReport.findUnique.bind(prisma.scheduledReport);
  prisma.scheduledReport.findUnique = async (...args) => {
    const report = await read(...args);
    process.send?.({ type: "read" });
    await new Promise<void>((resolve) => process.once("message", () => resolve()));
    return report;
  };
  const { executeReport } = await import("../../../src/services/schedulerService");
  await executeReport(process.argv[2], true);
}
main()
  .catch((error) => {
    process.send?.({ type: "failure", message: String(error) });
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
    process.disconnect?.();
  });
