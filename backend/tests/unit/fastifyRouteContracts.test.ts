import { describe, expect, it } from "vitest";
import { assertMigratedRouteContracts } from "../../src/platform/fastify/routeContracts";
import type { RouteEntry } from "../../src/platform/fastify/app";

const routes: RouteEntry[] = [
  ["GET", "/api/holidays"],
  ["POST", "/api/holidays"],
  ["POST", "/api/holidays/bulk"],
  ["POST", "/api/holidays/sync"],
  ["DELETE", "/api/holidays/:id"],
].map(([method, url]) => ({ method, url, authenticated: true, validated: true }));
describe("Fastify route guard anti-vacuity", () => {
  it("accepts a complete validated authenticated route surface", () =>
    expect(() => assertMigratedRouteContracts(routes)).not.toThrow());
  it("rejects an empty enumerator", () =>
    expect(() => assertMigratedRouteContracts([])).toThrow("empty"));
  it("rejects missing/extra routes", () =>
    expect(() => assertMigratedRouteContracts(routes.slice(1))).toThrow("differs"));
  it("rejects missing auth", () =>
    expect(() =>
      assertMigratedRouteContracts(
        routes.map((route, index) => (index === 0 ? { ...route, authenticated: false } : route)),
      ),
    ).toThrow("authentication"));
  it("rejects missing mutating validator", () =>
    expect(() =>
      assertMigratedRouteContracts(
        routes.map((route, index) => (index === 1 ? { ...route, validated: false } : route)),
      ),
    ).toThrow("Unvalidated"));
});
