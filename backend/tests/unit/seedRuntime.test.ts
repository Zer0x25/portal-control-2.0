import { expect, it } from "vitest";
import { SeedRuntime } from "../../src/services/seedRuntime";

it("rejects overlap and shutdown admission while drain waits for the real worker", async () => {
  const runtime = new SeedRuntime();
  let resolve!: () => void;
  const task = runtime.run(
    () =>
      new Promise<void>((done) => {
        resolve = done;
      }),
  );
  expect(() => runtime.run(async () => {})).toThrow("Seeder no disponible");
  let drained = false;
  const drain = runtime.drain().then(() => {
    drained = true;
  });
  await Promise.resolve();
  expect(drained).toBe(false);
  expect(() => runtime.openRuntime()).toThrow("Seeder aún está drenando");
  expect(() => runtime.run(async () => {})).toThrow("Seeder no disponible");
  resolve();
  await Promise.all([task, drain]);
  expect(drained).toBe(true);
  runtime.openRuntime();
  await expect(runtime.run(async () => "new-runtime")).resolves.toBe("new-runtime");
});

it("releases failed workers and drain absorbs an already reported failure", async () => {
  const runtime = new SeedRuntime();
  const task = runtime.run(async () => {
    throw new Error("engine");
  });
  const drain = runtime.drain();
  await expect(task).rejects.toThrow("engine");
  await drain;
});
