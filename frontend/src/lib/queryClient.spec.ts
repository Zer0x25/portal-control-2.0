import { describe, it, expect } from "vitest";
import { queryClient, isNonRetryableStatus, hasHttpStatus } from "./queryClient";
import { ApiHttpError } from "../services/apiClient";

describe("queryClient single retry owner and non-retryable 4xx classifier (AC2)", () => {
  it("fija queries.retry en false en defaultOptions (dueño único: apiClient)", () => {
    const defaultQueries = queryClient.getDefaultOptions().queries;
    expect(defaultQueries?.retry).toBe(false);
  });

  it("clasifica como no reintentable todo 4xx definitivo (400, 401, 403, 404, 409, 422)", () => {
    expect(isNonRetryableStatus(400)).toBe(true);
    expect(isNonRetryableStatus(401)).toBe(true);
    expect(isNonRetryableStatus(403)).toBe(true);
    expect(isNonRetryableStatus(404)).toBe(true);
    expect(isNonRetryableStatus(409)).toBe(true);
    expect(isNonRetryableStatus(422)).toBe(true);
  });

  it("excluye de no-reintentables los 4xx transitorios (408, 429) y los 5xx (500, 503)", () => {
    expect(isNonRetryableStatus(408)).toBe(false);
    expect(isNonRetryableStatus(429)).toBe(false);
    expect(isNonRetryableStatus(500)).toBe(false);
    expect(isNonRetryableStatus(502)).toBe(false);
    expect(isNonRetryableStatus(503)).toBe(false);
    expect(isNonRetryableStatus(504)).toBe(false);
    expect(isNonRetryableStatus(200)).toBe(false);
  });

  it("hasHttpStatus identifica correctamente errores con status numérico de ApiHttpError", () => {
    const error403 = new ApiHttpError("Forbidden", 403, "/api/test");
    expect(hasHttpStatus(error403)).toBe(true);

    const error404 = new ApiHttpError("Not Found", 404, "/api/test");
    expect(hasHttpStatus(error404)).toBe(true);

    const error500 = new ApiHttpError("Internal Error", 500, "/api/test");
    expect(hasHttpStatus(error500)).toBe(false);

    expect(hasHttpStatus(null)).toBe(false);
    expect(hasHttpStatus(undefined)).toBe(false);
    expect(hasHttpStatus("error string")).toBe(false);
    expect(hasHttpStatus(new Error("Plain error"))).toBe(false);
  });
});
