import { expect, it, vi } from "vitest";
import { HttpWork } from "../../src/platform/fastify/work";
it("response completion and abort retain an actual handler until its final write", async () => {
  const work = new HttpWork();
  const request = {};
  const releaseLease = vi.fn(async () => {});
  await work.enter(request, async () => releaseLease);
  let release!: () => void;
  const write = vi.fn();
  const handler = work.run(request, async () => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    write();
  });
  await work.end(request);
  await work.end(request);
  let drained = false;
  const closing = work.drain().then(() => {
    drained = true;
  });
  await expect(work.enter({}, async () => releaseLease)).rejects.toMatchObject({ statusCode: 503 });
  expect(drained).toBe(false);
  expect(releaseLease).not.toHaveBeenCalled();
  release();
  await Promise.all([handler, closing]);
  expect(write).toHaveBeenCalledOnce();
  expect(releaseLease).toHaveBeenCalledOnce();
});
it("owns admission still in flight after disconnect and cleans denied admission", async () => {
  const work = new HttpWork();
  const request = {};
  let release!: () => void;
  const releaseLease = vi.fn(async () => {});
  const entering = work.enter(request, async () => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    return releaseLease;
  });
  await work.end(request);
  let drained = false;
  const closing = work.drain().then(() => {
    drained = true;
  });
  expect(drained).toBe(false);
  release();
  await Promise.all([entering, closing]);
  expect(releaseLease).toHaveBeenCalledOnce();
  const denied = new HttpWork();
  await expect(
    denied.enter({}, async () => {
      throw new Error("admission unavailable");
    }),
  ).rejects.toThrow("admission unavailable");
  await denied.drain();
});
it("preserves task errors and releases work once after the error response", async () => {
  const work = new HttpWork();
  const request = {};
  const release = vi.fn(async () => {});
  await work.enter(request, async () => release);
  await expect(
    work.run(request, async () => {
      throw new Error("application error");
    }),
  ).rejects.toThrow("application error");
  expect(release).not.toHaveBeenCalled();
  await work.end(request);
  await work.drain();
  expect(release).toHaveBeenCalledOnce();
});
