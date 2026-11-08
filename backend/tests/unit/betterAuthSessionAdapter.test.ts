import { describe, it, expect } from "vitest";
import { mapBetterAuthSession } from "../../src/modules/auth/infrastructure/sessionAdapter";

describe("mapBetterAuthSession", () => {
  it("Administrador dura 10h y usa límite 10", () => {
    const r = mapBetterAuthSession(
      { role: "Administrador" } as never,
      new Date("2026-11-07T00:00:00Z"),
    );
    expect(r.hours).toBe(10);
    expect(r.limit).toBe(10);
  });

  it("Usuario dura 0.03h y usa límite 1", () => {
    const r = mapBetterAuthSession({ role: "Usuario" } as never, new Date());
    expect(r.hours).toBe(0.03);
    expect(r.limit).toBe(1);
  });
});
