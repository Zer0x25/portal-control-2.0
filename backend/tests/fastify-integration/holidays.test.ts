import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import type { FastifyInstance } from "fastify";
import expressApp from "../../src/app";
import { createFastifyRuntime } from "../../src/fastify/runtime";
import prisma, { prismaDirect } from "../../src/services/db";
import { SocketService } from "../../src/services/socketService";
import { assertConnectedToTestDb, resetIntegrationDb } from "../integration/_support/testDb";

let app: FastifyInstance;
const body = { date: "2026-10-10", name: "Feriado integración", type: "Civil" };
async function session(
  username: string,
  role: "Supervisor" | "Usuario" = "Supervisor",
  claimRole: string = role,
) {
  const user = await prismaDirect.user.create({
    data: { username, role, passwordHash: "integration-only-unused-hash" },
  });
  const token = jwt.sign({ id: user.id, username, role: claimRole }, process.env.JWT_SECRET!, {
    expiresIn: "1h",
  });
  await prismaDirect.activeSession.create({
    data: {
      userId: user.id,
      tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  return { token, headers: { authorization: `Bearer ${token}` }, user };
}

beforeAll(async () => {
  await assertConnectedToTestDb();
  // Probe the real SQL transaction variable; this trigger exists only in the disposable test DB.
  await prismaDirect.$executeRawUnsafe(
    "CREATE TABLE holiday_actor_probe (holiday_date TEXT, actor TEXT)",
  );
  await prismaDirect.$executeRawUnsafe(
    "CREATE FUNCTION holiday_actor_probe_fn() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN INSERT INTO holiday_actor_probe VALUES (NEW.date, current_setting('audit.username', true)); RETURN NEW; END $$",
  );
  await prismaDirect.$executeRawUnsafe(
    "CREATE TRIGGER holiday_actor_probe_trigger AFTER INSERT OR UPDATE ON holidays FOR EACH ROW EXECUTE FUNCTION holiday_actor_probe_fn()",
  );
  app = createFastifyRuntime({
    allowedOrigins: [],
    trustProxy: 1,
    rateLimit: { max: 5000, timeWindow: 900000 },
    logger: false,
  });
  await app.ready();
});
beforeEach(async () => {
  await resetIntegrationDb();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
afterAll(async () => {
  await resetIntegrationDb();
  await prismaDirect.$executeRawUnsafe(
    "DROP TRIGGER IF EXISTS holiday_actor_probe_trigger ON holidays",
  );
  await prismaDirect.$executeRawUnsafe("DROP FUNCTION IF EXISTS holiday_actor_probe_fn()");
  await prismaDirect.$executeRawUnsafe("DROP TABLE IF EXISTS holiday_actor_probe");
  await app?.close();
});

describe("Fastify + shared authentication + extended Prisma on real PostgreSQL", () => {
  it("matches Express GET/error contracts using a real signed JWT and persisted session", async () => {
    const actor = await session("supervisor");
    const created = await app.inject({
      method: "POST",
      url: "/api/holidays",
      payload: body,
      headers: actor.headers,
    });
    expect(created.statusCode).toBe(201);
    const url = "/api/holidays?showArchived=true&page=1&pageSize=10";
    const legacy = await request(expressApp).get(url).set(actor.headers);
    const migrated = await app.inject({ url, headers: actor.headers });
    expect(migrated.statusCode).toBe(legacy.status);
    expect(migrated.json()).toEqual(legacy.body);
    const legacyMissing = await request(expressApp).get(url);
    expect((await app.inject({ url })).json()).toEqual(legacyMissing.body);
    await prismaDirect.activeSession.deleteMany({ where: { userId: actor.user.id } });
    expect((await app.inject({ url, headers: actor.headers })).statusCode).toBe(401);
    expect((await request(expressApp).get(url).set(actor.headers)).status).toBe(401);
  });
  it("keeps concurrent actor context through the real direct transaction and both audit layers", async () => {
    const alice = await session("alice");
    const bob = await session("bob");
    const events = vi.spyOn(SocketService, "emit");
    const results = await Promise.all([
      app.inject({
        method: "POST",
        url: "/api/holidays",
        payload: { ...body, date: "2026-10-11" },
        headers: alice.headers,
      }),
      app.inject({
        method: "POST",
        url: "/api/holidays",
        payload: { ...body, date: "2026-10-12" },
        headers: bob.headers,
      }),
    ]);
    expect(results.map((r) => r.statusCode)).toEqual([201, 201]);
    const sqlActors = await prismaDirect.$queryRaw<
      { holiday_date: string; actor: string }[]
    >`SELECT holiday_date, actor FROM holiday_actor_probe ORDER BY holiday_date`;
    expect(sqlActors).toEqual([
      { holiday_date: "2026-10-11", actor: "alice" },
      { holiday_date: "2026-10-12", actor: "bob" },
    ]);
    await expect
      .poll(
        async () =>
          (
            await prisma.auditLog.findMany({
              where: { action: "HOLIDAY_UPSERT", actorUsername: { in: ["alice", "bob"] } },
            })
          ).length,
      )
      .toBe(4);
    expect(events).toHaveBeenCalledTimes(2);
  });
  it("denies writes with the persisted role even when JWT claims administrator", async () => {
    const actor = await session("reader", "Usuario", "Administrador");
    for (const [method, url, payload] of [
      ["POST", "/api/holidays", body],
      ["POST", "/api/holidays/bulk", [body]],
      ["POST", "/api/holidays/sync", { year: 2026 }],
      ["DELETE", "/api/holidays/id", undefined],
    ] as const)
      expect((await app.inject({ method, url, payload, headers: actor.headers })).statusCode).toBe(
        403,
      );
    expect(await prisma.holiday.count()).toBe(0);
  });
  it("validates entire bulk, then creates and deletes with actual DB status mapping", async () => {
    const actor = await session("bulk-supervisor");
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/holidays/bulk",
          payload: [body, { ...body, name: "X" }],
          headers: actor.headers,
        })
      ).statusCode,
    ).toBe(400);
    expect(await prisma.holiday.count()).toBe(0);
    const bulk = await app.inject({
      method: "POST",
      url: "/api/holidays/bulk",
      payload: [body, { ...body, date: "2026-10-11" }],
      headers: actor.headers,
    });
    expect(bulk.statusCode).toBe(201);
    expect(bulk.json()).toEqual({ count: 2 });
    const row = await prisma.holiday.findUniqueOrThrow({ where: { date: body.date } });
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/api/holidays/${row.id}`,
          headers: actor.headers,
        })
      ).statusCode,
    ).toBe(204);
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/api/holidays/${row.id}`,
          headers: actor.headers,
        })
      ).statusCode,
    ).toBe(404);
    expect(await prisma.holiday.count()).toBe(1);
  });
  it("syncs provider rows with audit/events and rejects a malformed entire provider response", async () => {
    const actor = await session("sync-supervisor");
    const events = vi.spyOn(SocketService, "emit");
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            status: "success",
            data: [{ date: "2026-01-01", title: "Año Nuevo", inalienable: true }],
          }),
          { headers: { "content-type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetcher);
    const response = await app.inject({
      method: "POST",
      url: "/api/holidays/sync",
      payload: { year: 2026 },
      headers: actor.headers,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ success: true, total: 1, year: 2026 });
    expect(await prisma.holiday.count()).toBe(1);
    expect(events).toHaveBeenCalledWith("holiday:updated", { type: "sync", count: 1 });
    fetcher.mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "success",
          data: [
            { date: "2026-02-02", title: "Valid", inalienable: false },
            { date: "invalid", title: "Bad", inalienable: true },
          ],
        }),
        { headers: { "content-type": "application/json" } },
      ),
    );
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/api/holidays/sync?token=${actor.token}`,
          payload: { year: 2026 },
        })
      ).statusCode,
    ).toBe(500);
    expect(await prisma.holiday.count()).toBe(1);
    expect(events).toHaveBeenCalledTimes(1);
    expect(
      await prisma.auditLog.count({
        where: { actorUsername: "sync-supervisor", action: "UNHANDLED_ERROR" },
      }),
    ).toBe(1);
    const errorLog = await prisma.auditLog.findFirstOrThrow({
      where: { actorUsername: "sync-supervisor", action: "UNHANDLED_ERROR" },
    });
    expect(errorLog.metadata).toMatchObject({ query: {} });
    expect(JSON.stringify(errorLog.metadata)).not.toContain(actor.token);
  });
  it("probes readiness against actual PostgreSQL", async () => {
    const response = await app.inject({ url: "/api/health/ready" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ready" });
  });
});
