import { createFastifyRuntime } from "../../../src/fastify/runtime";
import { workCoordinator } from "../../../src/services/workCoordinator";
import { prismaDirect } from "../../../src/services/db";
import { assertConnectedToTestDb } from "../../integration/_support/testDb";
async function main() {
  await assertConnectedToTestDb();
  const app = createFastifyRuntime({
    allowedOrigins: [],
    trustProxy: 1,
    rateLimit: { max: 5000, timeWindow: 900000 },
    logger: false,
  });
  let release!: () => void;
  app.get("/api/runtime-hold", async (_request, reply) => {
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    if (process.argv[2] !== "abort") reply.send({ accepted: true });
    process.send?.({ type: "entered" });
    await wait;
    await prismaDirect.systemConfig.create({
      data: { key: `worker:${workCoordinator.owner}`, value: "committed" },
    });
    process.send?.({ type: "written" });
    if (process.argv[2] === "error") throw new Error("owned failure after response");
    return reply;
  });
  const url = await app.listen({ port: 0, host: "127.0.0.1" });
  process.on("message", (message: { type: string }) => {
    if (message.type === "release") release();
    if (message.type === "close") {
      process.send?.({ type: "closing" });
      void app
        .close()
        .then(() => {
          process.send?.({ type: "closed" });
          process.disconnect?.();
        })
        .catch((error) => {
          process.send?.({ type: "failure", message: String(error) });
          process.exitCode = 1;
          process.disconnect?.();
        });
    }
  });
  process.send?.({ type: "ready", url, owner: workCoordinator.owner });
}
main().catch((error) => {
  process.send?.({ type: "failure", message: String(error) });
  process.exitCode = 1;
  process.disconnect?.();
});
