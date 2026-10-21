import { describe, it, expect } from "vitest";

import { isNonRetryableStatus, queryClient } from "./queryClient";

/**
 * Spec 034, AC2: el retry de transporte tiene un unico dueno (`apiClient`).
 *
 * - La capa de cache no reintenta: un GET que falla con 500/503 cuesta 3
 *   peticiones HTTP, no 9.
 * - Un 4xx distinto de 408 y 429 es definitivo: reintentarlo solo multiplica
 *   la carga sobre el backend.
 */
describe("queryClient (spec 034, AC2)", () => {
  it("no reintenta en la capa de cache", () => {
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(false);
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(false);
  });

  it("clasifica como no transitorio todo 4xx salvo 408 y 429", () => {
    for (const status of [400, 401, 402, 403, 404, 409, 410, 415, 422, 499]) {
      expect(isNonRetryableStatus({ status })).toBe(true);
    }
  });

  it("deja transitorios los 408, 429 y 5xx", () => {
    for (const status of [408, 429, 500, 502, 503, 504]) {
      expect(isNonRetryableStatus({ status })).toBe(false);
    }
  });

  it("ignora los errores sin status numerico", () => {
    expect(isNonRetryableStatus(new Error("boom"))).toBe(false);
    expect(isNonRetryableStatus(null)).toBe(false);
    expect(isNonRetryableStatus(undefined)).toBe(false);
    expect(isNonRetryableStatus("404")).toBe(false);
    expect(isNonRetryableStatus({ status: "404" })).toBe(false);
  });
});
