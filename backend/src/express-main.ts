import "dotenv/config";
import http from "node:http";
import path from "node:path";
import app from "./app";
import { SocketService } from "./services/socketService";
import { createRuntimeJobs } from "./services/runtimeJobs";
import { bindRuntimeHost } from "./services/runtimeHost";
import { seedRuntime } from "./services/seedRuntime";
import { seedingJobService } from "./services/seedingJobService";
import { closeDatabase } from "./services/db";
import { streamExportService } from "./services/export/StreamExportService";
import { logger } from "./utils/logger";

async function main() {
  const port = Number(process.env.PORT || 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT inválido");
  seedingJobService.openRuntime();
  seedRuntime.openRuntime();
  const server = http.createServer(app);
  SocketService.initialize(server);
  const jobs = createRuntimeJobs();
  const host = bindRuntimeHost(
    async () => {
      const closed = new Promise<void>((resolve) => server.close(() => resolve()));
      await jobs.stop();
      await SocketService.close();
      await closed;
      await streamExportService.close();
      await closeDatabase();
    },
    path.join(__dirname, "express-main.ts"),
  );
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, "0.0.0.0", () => {
        server.off("error", reject);
        resolve();
      });
    });
    await jobs.start();
    logger.info("Servidor backend iniciado", { eventType: "BOOT", port });
  } catch (error) {
    await host.shutdown();
    throw error;
  }
}
void main().catch((error) => {
  logger.error("Backend startup failed", error);
  process.exitCode = 1;
});
