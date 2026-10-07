import { operationRuntime } from "../../src/services/operationRuntime";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
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
async function websocket(token: string, userId = "") {
  const socket = new WebSocket(
    base.replace("http", "ws") + "/socket.io/?EIO=4&transport=websocket&userId=" + userId,
  );
  sockets.push(socket);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("error", reject, { once: true });
    socket.addEventListener("message", (event) => {
      const data = String(event.data);
      if (data.startsWith("0")) socket.send("40" + JSON.stringify({ token }));
      if (data.startsWith("40")) resolve();
      if (data.startsWith("44")) reject(new Error("Unauthorized"));
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
  const routes = app.routeManifest.filter(
    (route) => route.url.startsWith("/api/") && !route.url.startsWith("/api/health"),
  );
  expect(routes.length).toBeGreaterThan(100);
  const paths = (swaggerSpec as { paths: Record<string, Record<string, unknown>> }).paths;
  for (const route of routes) {
    const documented = route.url.replace(/:([^/]+)/g, "{$1}");
    expect(paths[documented], `${route.method} ${route.url}`).toHaveProperty(
      route.method.toLowerCase(),
    );
    if (["POST", "PUT", "PATCH", "DELETE"].includes(route.method))
      expect(route.validated, `${route.method} ${route.url}`).toBe(true);
  }
});
it("authenticates websocket identity and revokes sessions before delivery", async () => {
  const polling = await fetch(base + "/socket.io/?EIO=4&transport=polling");
  expect(polling.status).toBe(200);
  expect((await polling.text()).startsWith("0")).toBe(true);
  await expect(websocket("")).rejects.toThrow("Unauthorized");
  const user = await prismaDirect.user.create({
    data: { username: "socket-owner", role: "Administrador", passwordHash: "not-used" },
  });
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "5m" },
  );
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await prismaDirect.activeSession.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 300000) },
  });
  const own = await websocket(token, "victim");
  const serverSocket = [...SocketService.getInstance().sockets.sockets.values()][0]!;
  expect(serverSocket.rooms.has(`user:${user.id}`)).toBe(true);
  expect(serverSocket.rooms.has("user:victim")).toBe(false);
  const room = message(own);
  SocketService.emitToUser(user.id, "user_notification", {
    title: "Title",
    message: "Message",
    type: "info",
  });
  expect(await room).toBe(
    '42["user_notification",{"title":"Title","message":"Message","type":"info"}]',
  );
  await prismaDirect.activeSession.deleteMany({ where: { tokenHash } });
  const received: string[] = [];
  own.addEventListener("message", (event) => received.push(String(event.data)));
  SocketService.emitToAll("auditLog:created", { secret: "hidden" });
  await vi.waitFor(() => expect(SocketService.getInstance().sockets.sockets.size).toBe(0));
  expect(received.some((packet) => packet.includes("auditLog:created"))).toBe(false);
  expect(() => SocketService.initialize(app.server)).toThrow("already initialized");
});
it("delivers only projected role-authorized frames with persisted sessions", async () => {
  const frames = new Map<string, string[]>();
  for (const role of ["Administrador", "Fiscalizador", "Usuario"] as const) {
    const user = await prismaDirect.user.create({
      data: { username: `event-${role}`, role, passwordHash: "not-used" },
    });
    const token = jwt.sign(
      { id: user.id, username: user.username, role },
      process.env.JWT_SECRET!,
      { expiresIn: "5m" },
    );
    await prismaDirect.activeSession.create({
      data: {
        userId: user.id,
        tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + 300000),
      },
    });
    const client = await websocket(token);
    const received: string[] = [];
    frames.set(role, received);
    client.addEventListener("message", (event) => received.push(String(event.data)));
  }
  SocketService.emit("auditLog:created", { details: "protected-payload" });
  SocketService.emit("seeder:phase2_failed", { jobId: "job", error: "protected-payload" });
  SocketService.emit("config:updated", { value: { password: "protected-payload" } });
  SocketService.emit("system:maintenance", { active: false });
  await vi.waitFor(() => {
    for (const received of frames.values())
      expect(received).toContain('42["system:maintenance",{"active":false}]');
  });
  expect(frames.get("Administrador")).toContain('42["seeder:phase2_failed",{"jobId":"job"}]');
  expect(frames.get("Fiscalizador")).toContain('42["auditLog:created",{"changed":true}]');
  expect(frames.get("Fiscalizador")!.some((frame) => frame.includes("seeder"))).toBe(false);
  expect(frames.get("Usuario")!.some((frame) => /seeder|auditLog/.test(frame))).toBe(false);
  for (const received of frames.values())
    expect(received.join()).not.toContain("protected-payload");
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
  let release!: () => void;
  const pending = operationRuntime.run(async () => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    // The response may already be over; the application still needs a live pool.
    return prismaDirect.systemConfig.create({ data: { key: "drain-proof", value: "true" } });
  });
  await Promise.resolve();
  let closed = false;
  const closing = app.close().then(() => {
    closed = true;
  });
  await vi.waitFor(async () => {
    await expect(operationRuntime.run(() => "late")).rejects.toThrow("Runtime cerrando");
  });
  expect(closed).toBe(false);
  expect(stops).toBe(0);
  release();
  expect((await pending).key).toBe("drain-proof");
  await closing;
  await app.close();
  expect(starts).toBe(1);
  expect(stops).toBe(1);
  expect(SocketService.getIO()).toBeNull();
});
