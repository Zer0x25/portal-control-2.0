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
routes.push(
  ...["login", "kiosk-login", "logout", "mfa/setup", "mfa/verify", "mfa/validate"].map((path) => ({
    method: "POST",
    url: `/api/auth/${path}`,
    authenticated: ["mfa/setup", "mfa/verify"].includes(path),
    validated: true,
  })),
);
routes.push(
  ...[
    ["GET", "/api/users"],
    ["POST", "/api/users"],
    ["PUT", "/api/users/:id"],
    ["DELETE", "/api/users/:id"],
  ].map(([method, url]) => ({ method, url, authenticated: true, validated: true })),
);
routes.push(
  ...[
    ["GET", "/api/employees"],
    ["GET", "/api/employees/kiosk"],
    ["POST", "/api/employees"],
    ["PUT", "/api/employees/:id"],
    ["POST", "/api/employees/bulk"],
    ["GET", "/api/employees/export"],
  ].map(([method, url]) => ({
    method,
    url,
    authenticated: url !== "/api/employees/kiosk",
    validated: url !== "/api/employees/kiosk",
  })),
);
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
  it("rejects empty auth surface", () =>
    expect(() => assertMigratedRouteContracts(routes.slice(0, 5))).toThrow(
      "Auth route manifest is empty",
    ));
  it("rejects auth route missing", () =>
    expect(() =>
      assertMigratedRouteContracts(routes.filter((route) => route.url !== "/api/auth/login")),
    ).toThrow("differs"));
  it("rejects public auth route marked protected", () =>
    expect(() =>
      assertMigratedRouteContracts(
        routes.map((route) =>
          route.url === "/api/auth/login" ? { ...route, authenticated: true } : route,
        ),
      ),
    ).toThrow("authentication"));
  it("rejects protected MFA route marked public", () =>
    expect(() =>
      assertMigratedRouteContracts(
        routes.map((route) =>
          route.url === "/api/auth/mfa/setup" ? { ...route, authenticated: false } : route,
        ),
      ),
    ).toThrow("authentication"));
  it("rejects auth route missing validator", () =>
    expect(() =>
      assertMigratedRouteContracts(
        routes.map((route) =>
          route.url === "/api/auth/logout" ? { ...route, validated: false } : route,
        ),
      ),
    ).toThrow("Unvalidated"));
});

it("rejects missing users surface", () =>
  expect(() =>
    assertMigratedRouteContracts(routes.filter((route) => !route.url.startsWith("/api/users"))),
  ).toThrow("Users route manifest is empty"));
it("rejects users route without authentication", () =>
  expect(() =>
    assertMigratedRouteContracts(
      routes.map((route) =>
        route.url === "/api/users" ? { ...route, authenticated: false } : route,
      ),
    ),
  ).toThrow("authentication"));
it("rejects users path mutation without validator", () =>
  expect(() =>
    assertMigratedRouteContracts(
      routes.map((route) =>
        route.method === "DELETE" && route.url.startsWith("/api/users")
          ? { ...route, validated: false }
          : route,
      ),
    ),
  ).toThrow("Unvalidated"));

it("rejects empty employees surface", () =>
  expect(() =>
    assertMigratedRouteContracts(routes.filter((route) => !route.url.startsWith("/api/employees"))),
  ).toThrow("Employees route manifest is empty"));
it("rejects missing employees route", () =>
  expect(() =>
    assertMigratedRouteContracts(routes.filter((route) => route.url !== "/api/employees/export")),
  ).toThrow("differs"));
it("rejects kiosk marked protected", () =>
  expect(() =>
    assertMigratedRouteContracts(
      routes.map((route) =>
        route.url === "/api/employees/kiosk" ? { ...route, authenticated: true } : route,
      ),
    ),
  ).toThrow("authentication"));
it("rejects employees missing validator", () =>
  expect(() =>
    assertMigratedRouteContracts(
      routes.map((route) =>
        route.url === "/api/employees/export" ? { ...route, validated: false } : route,
      ),
    ),
  ).toThrow("Unvalidated"));
