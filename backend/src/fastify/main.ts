import "dotenv/config";
import path from "node:path";
import { createFastifyRuntime } from "./runtime";
import { integrateFastifyRuntime } from "./integrated";
import { createRuntimeJobs } from "../services/runtimeJobs";
import { bindRuntimeHost } from "../services/runtimeHost";
import { seedingJobService } from "../services/seedingJobService";
import { initSentry } from "../utils/sentry";
import { logger } from "../utils/logger";

async function main() {
  const port = Number(process.env.PORT || 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT inválido");
  initSentry();
  seedingJobService.openRuntime();
  const app = integrateFastifyRuntime(createFastifyRuntime(), createRuntimeJobs());
  const host = bindRuntimeHost(() => app.close(), path.join(__dirname, "main.ts"));
  try {
    await app.listen({ port, host: "0.0.0.0" });
    logger.info("Servidor candidato Fastify iniciado", { eventType: "BOOT", port });
  } catch (error) {
    await host.shutdown();
    throw error;
  }
}
void main().catch((error) => {
  logger.error("Fastify startup failed", error);
  process.exitCode = 1;
});
