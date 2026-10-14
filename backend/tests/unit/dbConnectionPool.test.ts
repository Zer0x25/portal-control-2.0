import { describe, expect, it, vi } from "vitest";
import {
  sanitizePgConnectionString,
  resolvePoolMax,
  withDirectTransaction,
  prismaDirect,
} from "../../src/services/db";
import { requestContext } from "../../src/utils/context";

describe("db connection and pool configuration (anti-regression)", () => {
  describe("sanitizePgConnectionString", () => {
    it("returns undefined when input is undefined or empty", () => {
      expect(sanitizePgConnectionString(undefined)).toBeUndefined();
      expect(sanitizePgConnectionString("")).toBeUndefined();
    });

    it("strips pgbouncer and connection_limit parameters while keeping valid URL structure", () => {
      const input =
        "postgresql://postgres:secret@db.local:5432/pweb3?pgbouncer=true&connection_limit=15&sslmode=require";
      const sanitized = sanitizePgConnectionString(input);
      expect(sanitized).toBeDefined();

      const url = new URL(sanitized!);
      expect(url.searchParams.has("pgbouncer")).toBe(false);
      expect(url.searchParams.has("connection_limit")).toBe(false);
      expect(url.searchParams.get("sslmode")).toBe("require");
      expect(url.hostname).toBe("db.local");
      expect(url.pathname).toBe("/pweb3");
    });

    it("leaves clean URLs intact", () => {
      const input = "postgresql://user:pass@127.0.0.1:5432/testdb";
      expect(sanitizePgConnectionString(input)).toBe(input);
    });

    it("returns raw string if url parsing fails (catch fallback)", () => {
      const invalid = "not-a-valid:url:://::5432";
      expect(sanitizePgConnectionString(invalid)).toBe(invalid);
    });
  });

  describe("resolvePoolMax", () => {
    it("parses valid positive integer strings", () => {
      expect(resolvePoolMax("25")).toBe(25);
      expect(resolvePoolMax("5")).toBe(5);
    });

    it("falls back to default when undefined, empty or non-numeric", () => {
      expect(resolvePoolMax(undefined)).toBe(10);
      expect(resolvePoolMax("")).toBe(10);
      expect(resolvePoolMax("abc")).toBe(10);
      expect(resolvePoolMax("NaN")).toBe(10);
    });

    it("respects custom default value", () => {
      expect(resolvePoolMax(undefined, 20)).toBe(20);
    });

    it("guarantees a minimum pool size of 1", () => {
      expect(resolvePoolMax("0")).toBe(10); // "0" evaluates falsy in || defaultValue -> 10
      expect(resolvePoolMax("-5")).toBe(1); // Math.max(-5, 1) -> 1
    });
  });

  describe("withDirectTransaction and skipTrigger", () => {
    it("executes audit.skip_trigger = 'true' when context.skipTrigger is true", async () => {
      const executedRaw: unknown[] = [];
      const fakeTx = {
        $executeRaw: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
          executedRaw.push({ sql: strings.join("?"), values });
          return Promise.resolve(1);
        }),
      };

      vi.spyOn(prismaDirect, "$transaction").mockImplementation(async (callback) => {
        return (callback as (tx: unknown) => Promise<unknown>)(fakeTx);
      });

      await requestContext.run({ username: "MIGRATOR", skipTrigger: true }, async () => {
        await withDirectTransaction(async (tx) => {
          expect(tx).toBe(fakeTx);
          return "ok";
        });
      });

      expect(fakeTx.$executeRaw).toHaveBeenCalledTimes(1);
      const call = executedRaw[0] as { sql: string; values: unknown[] };
      expect(call.sql).toContain("SELECT set_config('audit.skip_trigger', 'true', true)");
    });

    it("sets audit.username and audit.skip_trigger = 'false' when skipTrigger is false", async () => {
      const executedRaw: unknown[] = [];
      const fakeTx = {
        $executeRaw: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
          executedRaw.push({ sql: strings.join("?"), values });
          return Promise.resolve(1);
        }),
      };

      vi.spyOn(prismaDirect, "$transaction").mockImplementation(async (callback) => {
        return (callback as (tx: unknown) => Promise<unknown>)(fakeTx);
      });

      await requestContext.run({ username: "SUPERVISOR_1", skipTrigger: false }, async () => {
        await withDirectTransaction(async () => "done");
      });

      expect(fakeTx.$executeRaw).toHaveBeenCalledTimes(2);
      const firstCall = executedRaw[0] as { sql: string; values: unknown[] };
      const secondCall = executedRaw[1] as { sql: string; values: unknown[] };

      expect(firstCall.sql).toContain("SELECT set_config('audit.username'");
      expect(firstCall.values).toContain("SUPERVISOR_1");
      expect(secondCall.sql).toContain("SELECT set_config('audit.skip_trigger', 'false', true)");
    });
  });
});
