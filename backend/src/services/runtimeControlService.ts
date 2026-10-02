import fs from "fs";
import path from "path";

class RuntimeControlService {
  scheduleRestart(reason: string): void {
    if (process.env.NODE_ENV === "test") {
      return;
    }

    setTimeout(() => {
      console.warn(`[RUNTIME] Restart scheduled: ${reason}`);

      if (process.env.NODE_ENV === "development") {
        const touchFile = path.resolve(__dirname, "../index.ts");
        try {
          const time = new Date();
          fs.utimesSync(touchFile, time, time);
          console.warn("Triggered dev restart by touching", touchFile);
        } catch (error) {
          console.error("Failed to touch file for restart, falling back to exit", error);
          process.exit(0);
        }
        return;
      }

      process.exit(1);
    }, 1000);
  }
}

export const runtimeControlService = new RuntimeControlService();
