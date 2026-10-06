import "dotenv/config";
import { createFastifyRuntime } from "./runtime";
import { logger } from "../utils/logger";

async function main() {
  const port = Number(process.env.PORT || 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT inválido");
  const app = createFastifyRuntime();
  let closing: Promise<void> | undefined;
  const shutdown = () => {
    closing ??= app.close();
    void closing.catch((error) => {
      logger.error("Fastify shutdown failed", error);
      process.exitCode = 1;
    });
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
  try {
    await app.listen({ port, host: "0.0.0.0" });
    logger.info("Servidor candidato Fastify iniciado", { eventType: "BOOT", port });
  } catch (error) {
    await app.close();
    throw error;
  }
}
void main().catch((error) => {
  logger.error("Fastify startup failed", error);
  process.exitCode = 1;
});
