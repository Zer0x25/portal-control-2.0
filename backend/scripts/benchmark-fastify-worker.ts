import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import prisma, { prismaDirect, closeDatabase } from "../src/services/db";

async function main() {
  if (new URL(process.env.DATABASE_URL!).pathname !== "/pweb3_test")
    throw new Error("Benchmark requires disposable pweb3_test");
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET required");
  await prismaDirect.holiday.deleteMany();
  await prismaDirect.holiday.createMany({
    data: Array.from({ length: 500 }, (_, index) => ({
      id: `benchmark-${index}`,
      date: new Date(Date.UTC(2024, 0, index + 1)).toISOString().slice(0, 10),
      name: `Feriado ${index}`,
      type: "Civil",
    })),
  });
  const user = await prismaDirect.user.upsert({
    where: { username: "benchmark" },
    update: { role: "Supervisor" },
    create: { username: "benchmark", role: "Supervisor", passwordHash: "unused-benchmark-hash" },
  });
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, secret, {
    expiresIn: "1h",
  });
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await prismaDirect.activeSession.upsert({
    where: { tokenHash },
    update: { expiresAt: new Date(Date.now() + 3600000), lastActive: new Date() },
    create: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 3600000) },
  });
  let close: () => Promise<void>;
  let port: number;
  if (process.argv[2] === "express") {
    const { default: app } = await import("../src/app");
    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing HTTP address");
    port = address.port;
    close = async () => {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await closeDatabase();
    };
  } else if (process.argv[2] === "fastify") {
    const { createFastifyRuntime } = await import("../src/fastify/runtime");
    const app = createFastifyRuntime({
      allowedOrigins: [],
      trustProxy: 1,
      rateLimit: { max: 5000, timeWindow: 900000 },
      logger: false,
    });
    await app.listen({ port: 0, host: "127.0.0.1" });
    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("Missing HTTP address");
    port = address.port;
    close = () => app.close();
  } else throw new Error("Unknown framework");
  let cpu = process.cpuUsage();
  let start = process.hrtime.bigint();
  let peakRss = process.memoryUsage().rss;
  let sample: NodeJS.Timeout | undefined;
  process.on("message", (message) => {
    if (message === "start") {
      cpu = process.cpuUsage();
      start = process.hrtime.bigint();
      peakRss = process.memoryUsage().rss;
      sample = setInterval(() => {
        peakRss = Math.max(peakRss, process.memoryUsage().rss);
      }, 20);
      process.send?.({ started: true });
    } else if (message === "stop") {
      clearInterval(sample);
      const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
      const usage = process.cpuUsage(cpu);
      process.send?.({
        metrics: {
          measurementElapsedMs: elapsedMs,
          cpuMs: (usage.user + usage.system) / 1000,
          peakRssMiB: Math.max(peakRss, process.memoryUsage().rss) / 1024 / 1024,
        },
      });
    } else if (message === "close") {
      void close()
        .then(() => process.disconnect())
        .catch((error) => {
          console.error(error);
          process.exit(1);
        });
    }
  });
  process.send?.({
    ready: true,
    url: `http://127.0.0.1:${port}/api/holidays?showArchived=true&page=1&pageSize=50`,
    token,
    node: process.version,
  });
}
void main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
