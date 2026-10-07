import { afterEach, expect, it, vi } from "vitest";
import { createRuntimeLifecycle } from "../../src/modules/runtime";
afterEach(() => vi.useRealTimers());
it("starts once, cancels timers, drains running work before closing, closes once", async () => {
  vi.useFakeTimers();
  const events: string[] = [];
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const runtime = createRuntimeLifecycle({
    after: (ms, task) => {
      const id = setTimeout(task, ms);
      return () => clearTimeout(id);
    },
    every: (ms, task) => {
      const id = setInterval(task, ms);
      return () => clearInterval(id);
    },
    reportError: () => {
      events.push("error");
    },
  });
  runtime.start(() => {
    runtime.every(10, async () => {
      events.push("task");
      await pending;
      events.push("done");
    });
  });
  runtime.start(() => {
    throw new Error("duplicate");
  });
  await vi.advanceTimersByTimeAsync(10);
  const close = runtime.stop(async () => {
    events.push("close");
  });
  await vi.advanceTimersByTimeAsync(100);
  expect(events).toEqual(["task"]);
  release();
  await close;
  await runtime.stop(async () => {
    events.push("duplicate close");
  });
  expect(events).toEqual(["task", "done", "close"]);
  expect(vi.getTimerCount()).toBe(0);
});
it("tracks rejected work and refuses work after stop", async () => {
  const errors: unknown[] = [];
  const runtime = createRuntimeLifecycle({
    after: () => () => {},
    every: () => () => {},
    reportError: (e) => {
      errors.push(e);
    },
  });
  await runtime.run(async () => {
    throw new Error("failed");
  });
  expect(errors).toHaveLength(1);
  await runtime.stop(async () => {});
  const task = vi.fn();
  await runtime.run(task);
  expect(task).not.toHaveBeenCalled();
});

it("cancels retry wait during drain and continues recurring work after a rejected tick", async () => {
  vi.useFakeTimers();
  const errors: unknown[] = [];
  const runtime = createRuntimeLifecycle({
    after: (ms, task) => {
      const id = setTimeout(task, ms);
      return () => clearTimeout(id);
    },
    every: (ms, task) => {
      const id = setInterval(task, ms);
      return () => clearInterval(id);
    },
    reportError: (e) => {
      errors.push(e);
    },
  });
  let ticks = 0;
  runtime.every(10, async () => {
    ticks++;
    if (ticks === 1) throw new Error("tick failed");
  });
  await vi.advanceTimersByTimeAsync(20);
  expect(ticks).toBe(2);
  expect(errors).toHaveLength(1);
  const retry = runtime.wait(300000);
  await runtime.stop(async () => {});
  expect(await retry).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
});
