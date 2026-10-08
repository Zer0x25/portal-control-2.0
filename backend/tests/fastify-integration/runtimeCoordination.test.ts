import { fork, type ChildProcess } from "node:child_process";
import path from "node:path";
import { beforeAll, expect, it, vi } from "vitest";
import { WorkCoordinator } from "../../src/services/workCoordinator";
import { prismaDirect } from "../../src/services/db";
import { assertConnectedToTestDb } from "../integration/_support/testDb";
type Event = { type: string; url?: string; owner?: string; message?: string };
async function spawn(mode: string) {
  const child = fork(path.resolve("tests/fastify-integration/_support/runtimeWorker.ts"), [mode], {
    execArgv: ["--import", "tsx"],
    stdio: ["ignore", "ignore", "pipe", "ipc"],
  });
  const events: Event[] = [];
  let stderr = "";
  child.stderr?.on("data", (data) => {
    stderr += String(data);
  });
  child.on("message", (message) => events.push(message as Event));
  child.on("error", (error) => events.push({ type: "failure", message: error.message }));
  const exit = new Promise<number | null>((resolve) => child.once("exit", resolve));
  try {
    await vi.waitFor(
      () => {
        expect(
          events.filter((event) => event.type === "failure"),
          stderr,
        ).toHaveLength(0);
        expect(events.some((event) => event.type === "ready")).toBe(true);
      },
      { timeout: 10000 },
    );
  } catch (error) {
    child.kill("SIGKILL");
    await exit;
    throw error;
  }
  const ready = events.find((event) => event.type === "ready")!;
  return { child, events, exit, url: ready.url!, owner: ready.owner! };
}
async function wait(events: Event[], type: string) {
  await vi.waitFor(() => expect(events.some((event) => event.type === type)).toBe(true), {
    timeout: 10000,
  });
}
async function cleanup(state: {
  child: ChildProcess;
  exit: Promise<number | null>;
  owner: string;
}) {
  if (state.child.exitCode === null && state.child.signalCode === null) state.child.kill("SIGKILL");
  await state.exit;
  // Explicit recovery only after verified test worker exit. No production TTL.
  await prismaDirect.$executeRaw`DELETE FROM portal_runtime.permits WHERE owner = ${state.owner}::uuid`;
}
beforeAll(assertConnectedToTestDb);
it.each(["early", "abort", "error"])(
  "drains a real HTTP worker after %s response/disconnect before closing pools",
  async (mode) => {
    const state = await spawn(mode);
    try {
      const controller = new AbortController();
      const response = fetch(state.url + "/api/runtime-hold", { signal: controller.signal }).catch(
        () => null,
      );
      await wait(state.events, "entered");
      if (mode === "abort") {
        controller.abort();
        await response;
      } else expect((await response)!.status).toBe(200);
      state.child.send({ type: "close" });
      await wait(state.events, "closing");
      expect(state.events.some((event) => event.type === "closed")).toBe(false);
      const permits = await prismaDirect.$queryRaw<
        { count: bigint }[]
      >`SELECT count(*) FROM portal_runtime.permits WHERE owner = ${state.owner}::uuid`;
      expect(permits[0].count).toBe(1n);
      state.child.send({ type: "release" });
      expect(await state.exit).toBe(0);
      expect(state.events.some((event) => event.type === "written")).toBe(true);
      expect(state.events.some((event) => event.type === "closed")).toBe(true);
      expect(
        await prismaDirect.systemConfig.findUnique({ where: { key: `worker:${state.owner}` } }),
      ).toMatchObject({ value: "committed" });
      if (mode === "error") {
        expect(
          await prismaDirect.auditLog.count({
            where: {
              action: "UNHANDLED_ERROR",
              metadata: { path: ["path"], equals: "/api/runtime-hold" },
            },
          }),
        ).toBeGreaterThan(0);
      }
      const remaining = await prismaDirect.$queryRaw<
        { count: bigint }[]
      >`SELECT count(*) FROM portal_runtime.permits WHERE owner = ${state.owner}::uuid`;
      expect(remaining[0].count).toBe(0n);
    } finally {
      await cleanup(state);
    }
  },
  20000,
);
it("maintenance in a second process closes admission and waits for an early-response motor", async () => {
  const state = await spawn("early");
  const coordinator = new WorkCoordinator();
  try {
    expect((await fetch(state.url + "/api/runtime-hold")).status).toBe(200);
    await wait(state.events, "entered");
    let exclusive = false;
    const maintenance = coordinator.run("reset-controller", async () => {
      const release = await coordinator.maintenance("reset", 5000);
      try {
        exclusive = true;
        expect(
          await prismaDirect.systemConfig.findUnique({ where: { key: `worker:${state.owner}` } }),
        ).toMatchObject({ value: "committed" });
      } finally {
        await release();
      }
    });
    await vi.waitFor(async () => {
      const gate = await prismaDirect.$queryRaw<
        { operation: string | null }[]
      >`SELECT operation FROM portal_runtime.gate WHERE id = 1`;
      expect(gate[0].operation).toBe("reset");
    });
    expect(exclusive).toBe(false);
    expect((await fetch(state.url + "/api/notes")).status).toBe(503);
    expect((await fetch(state.url + "/api/admin/stats")).status).toBe(409);
    expect((await fetch(state.url + "/api/health/ready")).status).toBe(200);
    state.child.send({ type: "release" });
    await maintenance;
    expect(exclusive).toBe(true);
    state.child.send({ type: "close" });
    expect(await state.exit).toBe(0);
  } finally {
    await cleanup(state);
    await coordinator.drain();
  }
}, 20000);
it("crashed work stays claimed; a maintenance drain timeout never starts a destructive motor", async () => {
  const state = await spawn("early");
  const coordinator = new WorkCoordinator();
  try {
    expect((await fetch(state.url + "/api/runtime-hold")).status).toBe(200);
    await wait(state.events, "entered");
    state.child.kill("SIGKILL");
    await state.exit;
    const motor = vi.fn();
    await expect(
      coordinator.run("restore-controller", async () => {
        const release = await coordinator.maintenance("restore", 50);
        try {
          motor();
        } finally {
          await release();
        }
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(motor).not.toHaveBeenCalled();
    const claims = await prismaDirect.$queryRaw<
      { count: bigint }[]
    >`SELECT count(*) FROM portal_runtime.permits WHERE owner = ${state.owner}::uuid`;
    expect(claims[0].count).toBe(1n);
    const gate = await prismaDirect.$queryRaw<
      { operation: string | null }[]
    >`SELECT operation FROM portal_runtime.gate WHERE id = 1`;
    expect(gate[0].operation).toBeNull();
  } finally {
    await cleanup(state);
    await coordinator.drain();
  }
}, 20000);
it("nested detached work retains its permit after its parent promise settles", async () => {
  const coordinator = new WorkCoordinator();
  let release!: () => void;
  let child!: Promise<void>;
  await coordinator.run("parent", async () => {
    child = coordinator.run(
      "child",
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
  });
  let closed = false;
  const closing = coordinator.drain().then(() => {
    closed = true;
  });
  await expect(coordinator.run("late", async () => {})).rejects.toMatchObject({ statusCode: 503 });
  expect(closed).toBe(false);
  release();
  await Promise.all([child, closing]);
  expect(closed).toBe(true);
});
