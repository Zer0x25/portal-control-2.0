import { describe, it, expect } from "vitest";
import { toCaughtError } from "./caughtError";

describe("toCaughtError", () => {
  it("narrows Error instances", () => {
    const error = new Error("Network timeout");
    const result = toCaughtError(error);
    expect(result).toEqual({ message: "Network timeout", isError: true });
  });

  it("handles string error values", () => {
    const result = toCaughtError("Something went wrong");
    expect(result).toEqual({ message: "Something went wrong", isError: false });
  });

  it("extracts message and status from structured objects", () => {
    const result = toCaughtError({ message: "Forbidden", status: 403 });
    expect(result).toEqual({ message: "Forbidden", status: 403, isError: true });
  });

  it("extracts error field if message is missing", () => {
    const result = toCaughtError({ error: "Invalid token", status: 401 });
    expect(result).toEqual({ message: "Invalid token", status: 401, isError: true });
  });

  it("stringifies arbitrary objects without message or error properties", () => {
    const result = toCaughtError({ code: 500, detail: "DB down" });
    expect(result.isError).toBe(true);
    expect(result.message).toContain("DB down");
  });

  it("handles primitive non-string values", () => {
    const result = toCaughtError(404);
    expect(result).toEqual({ message: "404", isError: false });
  });
});
