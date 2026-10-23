import { describe, expect, it } from "vitest";

import { getHttpStatus, isHandledBusinessHttpError } from "../utils/loggerPolicy";

describe("logger Sentry policy", () => {
  it.each([400, 401, 403, 409])("treats HTTP %i as a handled business error", (status) => {
    expect(isHandledBusinessHttpError(status)).toBe(true);
  });

  it.each([undefined, 0, 404, 429, 500])("captures status %s as an unexpected error", (status) => {
    expect(isHandledBusinessHttpError(status)).toBe(false);
  });

  it("reads direct and nested HTTP status values", () => {
    expect(getHttpStatus([{ status: 403 }])).toBe(403);
    expect(getHttpStatus([{ response: { status: 409 } }])).toBe(409);
    expect(getHttpStatus([new Error("offline")])).toBeUndefined();
  });
});
