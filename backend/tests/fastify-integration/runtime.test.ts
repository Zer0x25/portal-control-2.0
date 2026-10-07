import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { createFastifyRuntime } from "../../src/fastify/runtime";
import { integrateFastifyRuntime } from "../../src/fastify/integrated";
import { SocketService } from "../../src/services/socketService";
import { swaggerSpec } from "../../src/utils/openapi";
import { prismaDirect } from "../../src/services/db";
import { seedingJobService } from "../../src/services/seedingJobService";
import { seedingEngine } from "../../src/services/seeder/SeederEngine";
import { assertConnectedToTestDb, resetIntegrationDb } from "../integration/_support/testDb";
let starts = 0,
  stops = 0;
const jobs = {
  start: async () => {
    starts++;
  },
  stop: async () => {
    stops++;
  },
};
const app = integrateFastifyRuntime(
  createFastifyRuntime({
    allowedOrigins: [],
    trustProxy: 1,
    rateLimit: { max: 5000, timeWindow: 900000 },
    logger: false,
  }),
  jobs,
);
let base: string;
const sockets: WebSocket[] = [];
async function websocket(userId = "") {
  const socket = new WebSocket(
    base.replace("http", "ws") + "/socket.io/?EIO=4&transport=websocket&userId=" + userId,
  );
  sockets.push(socket);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("error", reject, { once: true });
    socket.addEventListener("message", (event) => {
      const data = String(event.data);
      if (data.startsWith("0")) socket.send("40");
      if (data.startsWith("40")) resolve();
      if (data === "2") socket.send("3");
    });
  });
  return socket;
}
function message(socket: WebSocket) {
  return new Promise<string>((resolve) =>
    socket.addEventListener("message", (e) => resolve(String(e.data)), { once: true }),
  );
}
beforeAll(async () => {
  await assertConnectedToTestDb();
  await resetIntegrationDb();
  base = await app.listen({ port: 0, host: "127.0.0.1" });
});
afterAll(async () => {
  for (const s of sockets) s.close();
  await app.close();
});
it("serves the exact SDK contract and local UI assets without a session", async () => {
  expect(await (await fetch(base + "/api-docs.json")).json()).toEqual(swaggerSpec);
  for (const route of [
    "/api-docs",
    "/api-docs/init.js",
    "/api-docs/swagger-ui.css",
    "/api-docs/swagger-ui-bundle.js",
    "/api-docs/swagger-ui-standalone-preset.js",
  ]) {
    const response = await fetch(base + route);
    expect(response.status).toBe(200);
    expect((await response.text()).length).toBeGreaterThan(100);
  }
  expect(app.routeManifest.length).toBeGreaterThan(100);
});
it("uses the HTTP listener for polling and websocket; characterizes unauthenticated rooms and broadcasts", async () => {
  const polling = await fetch(base + "/socket.io/?EIO=4&transport=polling");
  expect(polling.status).toBe(200);
  expect((await polling.text()).startsWith("0")).toBe(true);
  const own = await websocket("arbitrary-user"),
    other = await websocket("other-user");
  const broadcast = [message(own), message(other)];
  SocketService.emitToAll("spec024:broadcast", { value: 7 });
  expect(await Promise.all(broadcast)).toEqual([
    '42["spec024:broadcast",{"value":7}]',
    '42["spec024:broadcast",{"value":7}]',
  ]);
  const room = message(own);
  SocketService.emitToUser("arbitrary-user", "spec024:private", { value: 8 });
  expect(await room).toBe('42["spec024:private",{"value":8}]');
  expect(() => SocketService.initialize(app.server)).toThrow("already initialized");
});
it("drains seeding work before shutdown, preserving resumable running state", async () => {
  seedingJobService.openRuntime();
  let release!: () => void;
  let entered!: () => void;
  const ready = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const pending = new Promise<number>((resolve) => {
    release = () => resolve(0);
  });
  vi.spyOn(seedingEngine, "preloadSeedingContext").mockResolvedValue({} as never);
  vi.spyOn(seedingEngine, "seedHistoryForDate").mockImplementation(async () => {
    entered();
    return pending;
  });
  const job = await prismaDirect.seedingJob.create({
    data: {
      type: "MARKINGS_PHASE2",
      status: "pending",
      createdBy: "spec024",
      config: { days: 1, leaveRatio: 0, correctionRequestRatio: 0, batchSize: 50 },
      progress: { currentDay: 0, totalDays: 1, processedRecords: 0, sealedRecords: 0, errors: 0 },
    },
  });
  const run = seedingJobService.run(job.id);
  await ready;
  let closed = false;
  const drain = seedingJobService.shutdown().then(() => {
    closed = true;
  });
  await Promise.resolve();
  expect(closed).toBe(false);
  release();
  await run;
  await drain;
  expect((await prismaDirect.seedingJob.findUnique({ where: { id: job.id } }))?.status).toBe(
    "running",
  );
  vi.restoreAllMocks();
});
it("resumes the drained worker and completes persisted progress with bounded engine doubles", async () => {
  seedingJobService.openRuntime();
  const job = await prismaDirect.seedingJob.findFirst({
    where: { createdBy: "spec024", status: "running" },
  });
  expect(job).not.toBeNull();
  const correction = vi.spyOn(seedingEngine, "seedCorrectionRequests").mockResolvedValue(undefined);
  const backfill = vi.spyOn(seedingEngine, "backfillTimeRecordIntegrity").mockResolvedValue(0);
  const preload = vi.spyOn(seedingEngine, "preloadSeedingContext").mockResolvedValue({} as never);
  await seedingJobService.resumePendingOnStartup();
  await seedingJobService.run(job!.id);
  const completed = await prismaDirect.seedingJob.findUnique({ where: { id: job!.id } });
  expect(completed?.status).toBe("completed");
  expect(completed?.finishedAt).toBeInstanceOf(Date);
  expect(correction).toHaveBeenCalledTimes(1);
  expect(backfill).toHaveBeenCalledTimes(1);
  correction.mockRestore();
  backfill.mockRestore();
  preload.mockRestore();
});
it("closes sockets, jobs and HTTP once, releases socket owner", async () => {
  await resetIntegrationDb();
  for (const s of sockets) s.close();
  await app.close();
  await app.close();
  expect(starts).toBe(1);
  expect(stops).toBe(1);
  expect(SocketService.getIO()).toBeNull();
});
