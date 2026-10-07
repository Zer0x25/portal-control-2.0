import fs from "fs";
import path from "path";

class RuntimeControlService {
  private handler?: (reason: string) => void;
  bind(handler: (reason: string) => void): () => void {
    if (this.handler) throw new Error("Runtime restart handler already bound");
    this.handler = handler;
    return () => {
      if (this.handler === handler) this.handler = undefined;
    };
  }

  scheduleRestart(reason: string): void {
    if (this.handler) {
      this.handler(reason);
      return;
    }
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
