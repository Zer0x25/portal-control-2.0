import { fork, type ChildProcess } from "node:child_process";
import path from "node:path";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { prismaDirect } from "../../src/services/db";
import { assertConnectedToTestDb, resetIntegrationDb } from "../integration/_support/testDb";
const children: {
  child: ChildProcess;
  events: { type: string; owner?: string; message?: string }[];
  exit: Promise<number | null>;
}[] = [];
function worker(id: string, mode = "auto") {
  const child = fork(
    path.resolve("tests/fastify-integration/_support/reportWorker.ts"),
    [id, mode],
    { execArgv: ["--import", "tsx"], stdio: ["ignore", "ignore", "pipe", "ipc"] },
  );
  const events: { type: string; owner?: string; message?: string }[] = [];
  child.on("message", (message) => events.push(message as (typeof events)[number]));
  child.on("error", (error) => events.push({ type: "failure", message: error.message }));
  const state = {
    child,
    events,
    exit: new Promise<number | null>((resolve) => child.once("exit", resolve)),
  };
  children.push(state);
  return state;
}
async function ready(state: (typeof children)[number]) {
  await vi.waitFor(() => expect(state.events.some((event) => event.type === "ready")).toBe(true), {
    timeout: 10000,
  });
}
async function rendered(state: (typeof children)[number]) {
  await vi.waitFor(() => expect(state.events.some((event) => event.type === "render")).toBe(true), {
    timeout: 10000,
  });
}
async function cleanup() {
  for (const state of children.splice(0)) {
    if (state.child.exitCode === null && state.child.signalCode === null) state.child.kill();
    await state.exit;
    const owner = state.events.find((event) => event.owner)?.owner;
    // Only after confirmed child exit; preserves normal production fail-closed ownership.
    if (owner)
      await prismaDirect.$executeRaw`DELETE FROM portal_runtime.permits WHERE owner = ${owner}::uuid`;
  }
}
beforeAll(async () => {
  await assertConnectedToTestDb();
  await resetIntegrationDb();
});
afterAll(async () => {
  await cleanup();
  await resetIntegrationDb();
});

it.each(["auto", "manual"])(
  "excludes a second %s process throughout rendering and delivery",
  async (mode) => {
    const report = await prismaDirect.scheduledReport.create({
      data: {
        name: "Multi process",
        reportType: "attendance_summary",
        frequency: "daily",
        cronExpression: "* * * * *",
        recipients: "fixture@example.com",
        createdBy: "fixture",
        nextRunAt: new Date(Date.now() - 60000),
      },
    });
    try {
      const first = worker(report.id, mode);
      await ready(first);
      first.child.send({ start: true });
      await rendered(first);
      const second = worker(report.id, mode);
      await ready(second);
      second.child.send({ start: true });
      expect(await second.exit).toBe(0);
      expect(
        second.events.some((event) => event.type === "render" || event.type === "delivery"),
      ).toBe(false);
      if (mode === "manual")
        expect(second.events.some((event) => event.type === "busy")).toBe(true);
      first.child.send({ release: true });
      expect(await first.exit).toBe(0);
      expect(first.events.filter((event) => event.type === "delivery")).toHaveLength(1);
      expect(
        (await prismaDirect.scheduledReport.findUniqueOrThrow({ where: { id: report.id } }))
          .lastRunAt,
      ).not.toBeNull();
    } finally {
      await cleanup();
    }
  },
  20000,
);
it("excludes a distinct due occurrence while an earlier occurrence remains alive", async () => {
  const report = await prismaDirect.scheduledReport.create({
    data: {
      name: "Distinct occurrence",
      reportType: "attendance_summary",
      frequency: "daily",
      cronExpression: "* * * * *",
      recipients: "fixture@example.com",
      createdBy: "fixture",
      nextRunAt: new Date(Date.now() - 60000),
    },
  });
  try {
    const first = worker(report.id);
    await ready(first);
    first.child.send({ start: true });
    await rendered(first);
    const nextDue = new Date(Date.now() - 1000);
    await prismaDirect.scheduledReport.update({
      where: { id: report.id },
      data: { nextRunAt: nextDue },
    });
    const second = worker(report.id);
    await ready(second);
    second.child.send({ start: true });
    expect(await second.exit).toBe(0);
    expect(second.events.some((event) => event.type === "render")).toBe(false);
    first.child.send({ release: true });
    expect(await first.exit).toBe(0);
    expect(
      (await prismaDirect.scheduledReport.findUniqueOrThrow({ where: { id: report.id } }))
        .nextRunAt,
    ).toEqual(nextDue);
    const third = worker(report.id);
    await ready(third);
    third.child.send({ start: true });
    await rendered(third);
    third.child.send({ release: true });
    expect(await third.exit).toBe(0);
    expect(third.events.filter((event) => event.type === "delivery")).toHaveLength(1);
  } finally {
    await cleanup();
  }
}, 20000);
it("simultaneous automatic starts across processes deliver exactly one occurrence", async () => {
  const report = await prismaDirect.scheduledReport.create({
    data: {
      name: "Simultaneous occurrence",
      reportType: "attendance_summary",
      frequency: "daily",
      cronExpression: "* * * * *",
      recipients: "fixture@example.com",
      createdBy: "fixture",
      nextRunAt: new Date(Date.now() - 60000),
    },
  });
  try {
    const first = worker(report.id),
      second = worker(report.id);
    await Promise.all([ready(first), ready(second)]);
    first.child.send({ start: true });
    second.child.send({ start: true });
    await vi.waitFor(
      () =>
        expect(
          [first, second].filter((state) => state.events.some((event) => event.type === "render")),
        ).toHaveLength(1),
      { timeout: 10000 },
    );
    const winner = [first, second].find((state) =>
      state.events.some((event) => event.type === "render"),
    )!;
    const loser = winner === first ? second : first;
    expect(await loser.exit).toBe(0);
    winner.child.send({ release: true });
    expect(await winner.exit).toBe(0);
    expect(
      [...first.events, ...second.events].filter((event) => event.type === "delivery"),
    ).toHaveLength(1);
  } finally {
    await cleanup();
  }
}, 20000);
it("a crashed renderer leaves persistent ownership until explicit offline recovery", async () => {
  const report = await prismaDirect.scheduledReport.create({
    data: {
      name: "Crash ownership",
      reportType: "attendance_summary",
      frequency: "daily",
      cronExpression: "* * * * *",
      recipients: "fixture@example.com",
      createdBy: "fixture",
      nextRunAt: new Date(Date.now() - 60000),
    },
  });
  try {
    const first = worker(report.id, "manual");
    await ready(first);
    first.child.send({ start: true });
    await rendered(first);
    first.child.kill("SIGKILL");
    await first.exit;
    const claim = await prismaDirect.$queryRaw<
      { key: string }[]
    >`SELECT key FROM portal_runtime.locks WHERE key = ${`report:${report.id}`}`;
    expect(claim).toHaveLength(1);
    const second = worker(report.id, "manual");
    await ready(second);
    second.child.send({ start: true });
    expect(await second.exit).toBe(0);
    expect(second.events.some((event) => event.type === "busy")).toBe(true);
    expect(
      second.events.some((event) => event.type === "render" || event.type === "delivery"),
    ).toBe(false);
    await cleanup(); // Both fixture processes have exited: an operator may now recover.
    const third = worker(report.id, "manual");
    await ready(third);
    third.child.send({ start: true });
    await rendered(third);
    third.child.send({ release: true });
    expect(await third.exit).toBe(0);
    expect(third.events.filter((event) => event.type === "delivery")).toHaveLength(1);
  } finally {
    await cleanup();
  }
}, 20000);
