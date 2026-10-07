import fs from "node:fs";
import { runtimeControlService } from "./runtimeControlService";
import { logger } from "../utils/logger";

export function bindRuntimeHost(close: () => Promise<void>, entrypoint: string) {
  let closing: Promise<void> | undefined;
  let restartTimer: NodeJS.Timeout | undefined;
  const shutdown = () => {
    if (!closing) {
      process.off("SIGTERM", signal);
      process.off("SIGINT", signal);
      if (restartTimer) clearTimeout(restartTimer);
      releaseRestart();
      closing = Promise.resolve().then(close);
    }
    return closing;
  };
  const signal = () => {
    void shutdown().catch((error) => {
      logger.error("Runtime shutdown failed", error);
      process.exitCode = 1;
    });
  };
  const releaseRestart = runtimeControlService.bind((reason) => {
    if (restartTimer || closing) return;
    restartTimer = setTimeout(() => {
      logger.warn("Runtime restart requested", { reason });
      void shutdown()
        .then(() => {
          if (process.env.NODE_ENV === "development") {
            const now = new Date();
            fs.utimesSync(entrypoint, now, now);
          } else process.exitCode = 1;
        })
        .catch((error) => {
          logger.error("Runtime restart failed", error);
          process.exitCode = 1;
        });
    }, 1000);
  });
  process.once("SIGTERM", signal);
  process.once("SIGINT", signal);
  return { shutdown };
}
