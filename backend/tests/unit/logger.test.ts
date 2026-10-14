import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "../../src/utils/logger";
import { requestContext } from "../../src/utils/context";

describe("structured logger anti-regression unit tests", () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("emits structured json payload with timestamp, level and message", () => {
    logger.info("Test message", { foo: "bar" });

    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    const written = stdoutSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(written);

    expect(parsed).toMatchObject({
      level: "info",
      message: "Test message",
      foo: "bar",
    });
    expect(parsed.timestamp).toBeDefined();
    expect(parsed.requestId).toBeUndefined();
    expect(parsed.actorUsername).toBeUndefined();
  });

  it("attaches requestId and actorUsername from requestContext store", () => {
    requestContext.run({ requestId: "req-abc-123", username: "supervisor_1" }, () => {
      logger.warn("Warning with context", { detail: "extra" });
    });

    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    const written = stdoutSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(written);

    expect(parsed).toMatchObject({
      level: "warn",
      message: "Warning with context",
      requestId: "req-abc-123",
      actorUsername: "supervisor_1",
      detail: "extra",
    });
  });
});
