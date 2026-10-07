import { fork } from "node:child_process";
import path from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { prismaDirect } from "../../src/services/db";
import { assertConnectedToTestDb, resetIntegrationDb } from "../integration/_support/testDb";
beforeAll(async () => {
  await assertConnectedToTestDb();
  await resetIntegrationDb();
});
afterAll(async () => {
  await resetIntegrationDb();
});
it("two real processes reading the same occurrence produce one delivery", async () => {
  const due = new Date(Date.now() - 60000);
  const report = await prismaDirect.scheduledReport.create({
    data: {
      name: "Multi process",
      reportType: "attendance_summary",
      frequency: "daily",
      cronExpression: "* * * * *",
      recipients: "fixture@example.com",
      createdBy: "fixture",
      nextRunAt: due,
    },
  });
  const children = Array.from({ length: 2 }, () =>
    fork(path.resolve("tests/fastify-integration/_support/reportWorker.ts"), [report.id], {
      execArgv: ["--import", "tsx"],
      stdio: ["ignore", "ignore", "pipe", "ipc"],
    }),
  );
  let deliveries = 0;
  try {
    const exits = children.map(
      (child) =>
        new Promise<void>((resolve, reject) => {
          let stderr = "";
          child.stderr?.on("data", (data) => {
            stderr += String(data);
          });
          child.on("error", reject);
          child.on("message", (message: any) => {
            if (message.type === "delivery") deliveries++;
            if (message.type === "failure") reject(new Error(message.message));
          });
          child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(stderr))));
        }),
    );
    const ready = Promise.all(
      children.map(
        (child) =>
          new Promise<void>((resolve, reject) => {
            child.on("error", reject);
            child.on("exit", () => reject(new Error("Worker exited before barrier release")));
            child.on("message", (message: any) => {
              if (message.type === "read") resolve();
            });
          }),
      ),
    ).then(() => {
      children.forEach((child) => child.send({ release: true }));
    });
    await Promise.all([ready, ...exits]);
    expect(deliveries).toBe(1);
    const saved = await prismaDirect.scheduledReport.findUniqueOrThrow({
      where: { id: report.id },
    });
    expect(saved.nextRunAt!.getTime()).toBeGreaterThan(due.getTime());
    expect(saved.lastRunAt).not.toBeNull();
  } finally {
    children.forEach((child) => {
      if (child.exitCode === null) child.kill();
    });
  }
}, 20000);
