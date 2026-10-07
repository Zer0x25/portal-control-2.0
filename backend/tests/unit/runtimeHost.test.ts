import fs from "node:fs";
import { expect, it, vi } from "vitest";
import { bindRuntimeHost } from "../../src/services/runtimeHost";
import { runtimeControlService } from "../../src/services/runtimeControlService";
it("signals and repeated close drain once and remove signal/restart handlers", async () => {
  const before = [process.listenerCount("SIGTERM"), process.listenerCount("SIGINT")];
  const close = vi.fn(async () => {});
  const host = bindRuntimeHost(close, __filename);
  const signal = process.listeners("SIGINT").at(-1)!;
  signal("SIGINT");
  await host.shutdown();
  await host.shutdown();
  expect(close).toHaveBeenCalledTimes(1);
  expect([process.listenerCount("SIGTERM"), process.listenerCount("SIGINT")]).toEqual(before);
  const next = bindRuntimeHost(close, __filename);
  await next.shutdown();
});
it("restart is deferred after response and closes once, cancellable by shutdown", async () => {
  vi.useFakeTimers();
  const close = vi.fn(async () => {});
  const host = bindRuntimeHost(close, __filename);
  runtimeControlService.scheduleRestart("test");
  runtimeControlService.scheduleRestart("twice");
  expect(close).not.toHaveBeenCalled();
  await host.shutdown();
  await vi.advanceTimersByTimeAsync(1000);
  expect(close).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
  vi.useRealTimers();
});

it("restart closes before touching the active development entrypoint", async () => {
  vi.useFakeTimers();
  vi.stubEnv("NODE_ENV", "development");
  const events: string[] = [];
  const touch = vi.spyOn(fs, "utimesSync").mockImplementation(() => {
    events.push("touch");
  });
  const host = bindRuntimeHost(async () => {
    events.push("close");
  }, __filename);
  try {
    runtimeControlService.scheduleRestart("development");
    await vi.advanceTimersByTimeAsync(1000);
    expect(events).toEqual(["close", "touch"]);
    expect(touch).toHaveBeenCalledWith(__filename, expect.any(Date), expect.any(Date));
    await host.shutdown();
    expect(events).toHaveLength(2);
  } finally {
    touch.mockRestore();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  }
});
