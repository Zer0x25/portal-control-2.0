import { holidayService } from "./src/services/HolidayService";
import dotenv from "dotenv";
dotenv.config();

async function testSync() {
  console.log("Starting holiday sync test...");
  try {
    const result = await holidayService.syncExternalHolidays(2026, "TEST_RUNNER");
    console.log("Sync successful:", result);
  } catch (error) {
    console.error("Sync failed with error:", error);
  } finally {
    process.exit(0);
  }
}

testSync();
