import { describe, expect, it } from "vitest";
import { authorizeCorrectionResolver } from "../../src/middleware/authMiddleware";

const invokeMiddleware = (role?: string) => {
  return new Promise<{ allowed: boolean; error?: Error }>((resolve) => {
    const req = { user: role ? { role } : undefined } as any;
    const res = {} as any;
    const next = (err?: Error) => {
      if (err) {
        resolve({ allowed: false, error: err });
      } else {
        resolve({ allowed: true });
      }
    };

    try {
      authorizeCorrectionResolver(req, res, next);
    } catch (error) {
      resolve({ allowed: false, error: error as Error });
    }
  });
};

describe("Correction Resolver Permissions", () => {
  it("allows Administrador", async () => {
    const result = await invokeMiddleware("Administrador");
    expect(result.allowed).toBe(true);
  });

  it("allows Supervisor_Elevado", async () => {
    const result = await invokeMiddleware("Supervisor_Elevado");
    expect(result.allowed).toBe(true);
  });

  it("allows Supervisor", async () => {
    const result = await invokeMiddleware("Supervisor");
    expect(result.allowed).toBe(true);
  });

  it("denies Reloj_Control", async () => {
    const result = await invokeMiddleware("Reloj_Control");
    expect(result.allowed).toBe(false);
    expect(result.error?.name).toBe("Error");
    expect(result.error?.message).toContain("Solo Supervisor");
  });

  it("denies Usuario", async () => {
    const result = await invokeMiddleware("Usuario");
    expect(result.allowed).toBe(false);
    expect(result.error?.message).toContain("Solo Supervisor");
  });
});
