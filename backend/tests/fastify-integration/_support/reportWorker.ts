import { ExportService } from "../../../src/services/export/ExportService";
import { EmailService } from "../../../src/services/EmailService";
import { closeDatabase } from "../../../src/services/db";
import { workCoordinator } from "../../../src/services/workCoordinator";
import { assertConnectedToTestDb } from "../../integration/_support/testDb";
const command = () => new Promise<void>((resolve) => process.once("message", () => resolve()));
async function main() {
  await assertConnectedToTestDb();
  ExportService.prototype.generateReportPDF = async () => {
    process.send?.({ type: "render" });
    await command();
    return Buffer.from("%PDF-test-fixture");
  };
  EmailService.prototype.sendEmailWithAttachment = async () => {
    process.send?.({ type: "delivery" });
    return { success: true, message: "fixture" };
  };
  process.send?.({ type: "ready", owner: workCoordinator.owner });
  await command();
  const { executeReport } = await import("../../../src/services/schedulerService");
  try {
    await executeReport(process.argv[2], process.argv[3] !== "manual");
  } catch (error) {
    if (error instanceof Error && "statusCode" in error && error.statusCode === 409) {
      process.send?.({ type: "busy" });
    } else throw error;
  }
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
