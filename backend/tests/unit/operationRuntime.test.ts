import { expect, it } from "vitest";
import { OperationRuntime } from "../../src/services/operationRuntime";

it("waits for all real operations and denies admission while draining", async () => {
  const runtime = new OperationRuntime();
  const releases: (() => void)[] = [];
  const tasks = [0, 1].map(() =>
    runtime.run(() => new Promise<void>((resolve) => releases.push(resolve))),
  );
  await Promise.resolve();
  let drained = false;
  const drain = runtime.drain().then(() => {
    drained = true;
  });
  await expect(runtime.run(() => "late")).rejects.toThrow("Runtime cerrando");
  expect(() => runtime.openRuntime()).toThrow("drenando");
  releases[0]();
  await tasks[0];
  expect(drained).toBe(false);
  releases[1]();
  await Promise.all([...tasks, drain]);
  expect(drained).toBe(true);
  runtime.openRuntime();
  await expect(runtime.run(() => 42)).resolves.toBe(42);
});

it("keeps ownership after a response callback and preserves application errors", async () => {
  const runtime = new OperationRuntime();
  let release!: () => void;
  let responseEnded = false;
  const flow = runtime.wrap(async (send: () => void) => {
    send();
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    throw new Error("audit failure");
  });
  const task = flow(() => {
    responseEnded = true;
  });
  await Promise.resolve();
  expect(responseEnded).toBe(true);
  const drain = runtime.drain();
  expect(() => runtime.openRuntime()).toThrow("drenando");
  release();
  await expect(task).rejects.toThrow("audit failure");
  await drain;
  runtime.openRuntime();
});

it("tracks synchronous failures and closeAdmission does not start queued work", async () => {
  const runtime = new OperationRuntime();
  const task = runtime.run(() => {
    throw new Error("sync");
  });
  runtime.closeAdmission();
  let started = false;
  await expect(
    runtime.run(() => {
      started = true;
    }),
  ).rejects.toThrow("Runtime cerrando");
  await expect(task).rejects.toThrow("sync");
  await runtime.drain();
  expect(started).toBe(false);
});
