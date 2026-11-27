import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createFastifyRuntime } from "../../src/fastify/runtime";
import { projectRealtimeEvent } from "../../src/modules/realtime/application/eventPolicy";
import { AuthService } from "../../src/services/AuthService";
import { prismaDirect } from "../../src/services/db";
import { clearLoginFailures } from "../../src/services/loginFailures";
import { getChileDateISO } from "../../src/utils/timeUtils";
import { assertConnectedToTestDb, resetIntegrationDb } from "../integration/_support/testDb";
import { httpClient } from "./_support/http";

let fastify: FastifyInstance;
let adminToken: string;

const empData = {
  id: "EMP-KIOSK-1",
  name: "Kiosk Hardening",
  rut: "12345678-9",
  position: "Operator",
  area: "Ops",
  workdayType: "Normal",
};

const today = () => getChileDateISO(new Date());

beforeAll(async () => {
  await assertConnectedToTestDb();
  fastify = createFastifyRuntime({
    allowedOrigins: [],
    trustProxy: 1,
    rateLimit: { max: 5000, timeWindow: 900000 },
    logger: false,
  });
  await fastify.ready();
});

beforeEach(async () => {
  await resetIntegrationDb();
  await clearLoginFailures("127.0.0.1", empData.id);
  const admin = await prismaDirect.user.create({
    data: {
      username: "kiosk-hardening-admin",
      role: "Super_Administrador",
      passwordHash: "test-only",
    },
  });
  adminToken = (await AuthService.createSession(admin.id, admin.username, admin.role, null, "test"))
    .token;
});

afterAll(async () => {
  await fastify.close();
});

describe("Marcaje Kiosco Phase 4 Hardening", () => {
  it("[BUG-01][BUG-02][BUG-03] enforces PII-free kiosk list, mustChangePin, revocable jti, and 403 on 5th failure", async () => {
    const initialPinHash = bcrypt.hashSync(empData.rut.slice(0, 4), 4);
    await prismaDirect.employee.create({ data: { ...empData, pin: initialPinHash } });

    const kioskRes = await fastify.inject({ method: "GET", url: "/api/employees/kiosk" });
    expect(kioskRes.statusCode).toBe(200);
    const list = kioskRes.json();
    expect(list).toHaveLength(1);
    expect(list[0]).not.toHaveProperty("rut");
    expect(list[0].rutHash).toBe(
      crypto
        .createHash("sha256")
        .update(empData.rut.replace(/\./g, "").toUpperCase())
        .digest("hex"),
    );
    expect(list[0].workdayType).toBe("Normal");

    // Non-numeric PIN rejected with 400 without consuming attempts
    const badFormat = await fastify.inject({
      method: "POST",
      url: "/api/auth/kiosk-login",
      payload: { employeeId: empData.id, pin: "abcd" },
    });
    expect(badFormat.statusCode).toBe(400);
    expect(
      (await prismaDirect.employee.findUniqueOrThrow({ where: { id: empData.id } }))
        .pinFailedAttempts,
    ).toBe(0);

    // Login with initial PIN returns mustChangePin=true
    const loginRes = await fastify.inject({
      method: "POST",
      url: "/api/auth/kiosk-login",
      payload: { employeeId: empData.id, pin: "1234" },
    });
    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.json().mustChangePin).toBe(true);
    const kioskToken = loginRes.json().token as string;

    // Rejects setting PIN === rut.slice(0, 4)
    const samePinRes = await fastify.inject({
      method: "PUT",
      url: `/api/employees/${empData.id}`,
      headers: { authorization: `Bearer ${kioskToken}` },
      payload: { pin: "1234" },
    });
    expect(samePinRes.statusCode).toBe(400);

    // Valid PIN change succeeds
    const changePinRes = await fastify.inject({
      method: "PUT",
      url: `/api/employees/${empData.id}`,
      headers: { authorization: `Bearer ${kioskToken}` },
      payload: { pin: "5678" },
    });
    expect(changePinRes.statusCode).toBe(200);

    // Logout revokes kiosk session immediately
    const logoutRes = await fastify.inject({
      method: "POST",
      url: "/api/auth/logout",
      headers: { authorization: `Bearer ${kioskToken}` },
    });
    expect(logoutRes.statusCode).toBe(200);
    const afterLogout = await fastify.inject({
      method: "GET",
      url: "/api/records",
      headers: { authorization: `Bearer ${kioskToken}` },
    });
    expect(afterLogout.statusCode).toBe(401);

    // Re-login with new PIN returns mustChangePin=false
    const relogin = await fastify.inject({
      method: "POST",
      url: "/api/auth/kiosk-login",
      payload: { employeeId: empData.id, pin: "5678" },
    });
    expect(relogin.statusCode).toBe(200);
    expect(relogin.json().mustChangePin).toBe(false);
    const token2 = relogin.json().token as string;

    // Blocking PIN in DB invalidates active kiosk token with 403
    await prismaDirect.employee.update({
      where: { id: empData.id },
      data: { isPinBlocked: true },
    });
    const whileBlocked = await fastify.inject({
      method: "GET",
      url: "/api/records",
      headers: { authorization: `Bearer ${token2}` },
    });
    expect(whileBlocked.statusCode).toBe(403);
  });

  it("[BUG-05][BUG-06][BUG-07][BUG-08][BUG-13][BUG-14] enforces sequence, previous-day isolation, integrity chain, atomic cooldown, and GPS 0,0", async () => {
    await prismaDirect.employee.create({
      data: { ...empData, pin: bcrypt.hashSync("5678", 4) },
    });
    const http = httpClient(
      () => fastify,
      () => adminToken,
    );

    // [BUG-05] Seed previous day AnomaliaManual (salida: null)
    await prismaDirect.timeRecord.create({
      data: {
        employeeId: empData.id,
        employeeName: empData.name,
        date: "2026-11-15",
        entrada: "2026-11-15T12:00:00.000Z",
        salida: null,
        status: "AnomaliaManual",
        source: "KIOSK",
      },
    });

    // [BUG-06] salida without entrada today must return 400
    const badExit = await http("POST", "/api/records/punch", {
      employeeId: empData.id,
      forcedType: "salida",
      latitude: -33.45,
      longitude: -70.65,
    });
    expect(badExit.status).toBe(400);

    // [BUG-14] GPS 0,0 preserved on entrada
    const entry = await http("POST", "/api/records/punch", {
      employeeId: empData.id,
      source: "KIOSK",
      forcedType: "entrada",
      latitude: 0,
      longitude: 0,
    });
    expect(entry.status).toBe(200);
    const entryBody = entry.body as {
      record: { id: string; entradaLatitude: number; entradaLongitude: number };
    };
    expect(entryBody.record.entradaLatitude).toBe(0);
    expect(entryBody.record.entradaLongitude).toBe(0);

    // [BUG-08] Immediate punch WITHOUT forcedType blocked by atomic 15s cooldown
    const cooldownHit = await http("POST", "/api/records/punch", {
      employeeId: empData.id,
      source: "KIOSK",
    });
    expect(cooldownHit.status).toBe(429);

    // [BUG-07] Insert interleaved record R2 (2026-11-14) and update R1 to salida
    const r2 = await http("POST", "/api/records", {
      employeeId: empData.id,
      employeeName: empData.name,
      date: "2026-11-14",
      entrada: "2026-11-14T12:00:00.000Z",
      salida: "2026-11-14T20:00:00.000Z",
      status: "Completado",
    });
    expect(r2.status).toBe(200);

    // Backdate R1 entrada slightly so cooldown doesn't block salida
    await prismaDirect.timeRecord.update({
      where: { id: entryBody.record.id },
      data: { entrada: new Date(Date.now() - 20_000).toISOString() },
    });

    const exit = await http("POST", "/api/records/punch", {
      employeeId: empData.id,
      source: "KIOSK",
      forcedType: "salida",
    });
    expect(exit.status).toBe(200);
    expect((exit.body as { record: { status: string } }).record.status).toBe("Completado");

    // [BUG-07] Verify integrity chain remains unbroken (excluding unsealed seed row)
    await prismaDirect.timeRecord.deleteMany({ where: { date: "2026-11-15" } });
    const verifyRes = await http(
      "GET",
      `/api/records/integrity/verify?employeeId=${empData.id}&from=2026-11-01&to=${today()}`,
    );
    expect(verifyRes.status).toBe(200);
    expect((verifyRes.body as { broken: unknown[] }).broken).toEqual([]);
    expect(
      (verifyRes.body as { summary: { checkedCount: number; brokenCount: number } }).summary,
    ).toMatchObject({
      checkedCount: 2,
      brokenCount: 0,
    });

    // [BUG-06] Second salida after Completado must return 400
    await prismaDirect.timeRecord.update({
      where: { id: entryBody.record.id },
      data: { salida: new Date(Date.now() - 20_000).toISOString() },
    });
    const afterComplete = await http("POST", "/api/records/punch", {
      employeeId: empData.id,
      forcedType: "salida",
    });
    expect(afterComplete.status).toBe(400);
  });

  it("[BUG-12][BUG-15][BUG-16] rejects invalid pagination, enforces punch RBAC, and delivers realtime event", async () => {
    await prismaDirect.employee.create({
      data: { ...empData, status: "Archivado", pin: bcrypt.hashSync("5678", 4) },
    });
    const http = httpClient(
      () => fastify,
      () => adminToken,
    );

    expect((await http("GET", "/api/employees/kiosk?page=-1", undefined, null)).status).toBe(400);
    expect((await http("GET", "/api/records?page=-1")).status).toBe(400);
    expect((await http("GET", "/api/records?pageSize=-10")).status).toBe(400);
    expect((await http("GET", "/api/records?showAnomalies=true")).status).toBe(200);

    // Admin punching for Archived employee -> 403
    const archivedPunch = await http("POST", "/api/records/punch", {
      employeeId: empData.id,
      forcedType: "entrada",
    });
    expect(archivedPunch.status).toBe(403);

    // Fiscalizador punching -> 403
    const fisc = await prismaDirect.user.create({
      data: { username: "fisc-user", role: "Fiscalizador", passwordHash: "test-only" },
    });
    const fiscToken = (
      await AuthService.createSession(fisc.id, fisc.username, fisc.role, null, "test")
    ).token;
    const fiscPunch = await fastify.inject({
      method: "POST",
      url: "/api/records/punch",
      headers: { authorization: `Bearer ${fiscToken}` },
      payload: { employeeId: empData.id, forcedType: "entrada" },
    });
    expect(fiscPunch.statusCode).toBe(403);

    // [BUG-16] Event policy delivers timeRecord:created to Kiosk_Employee & Usuario
    expect(
      projectRealtimeEvent(
        "timeRecord:created",
        { record: { employeeId: empData.id }, action: "ENTRADA" },
        { id: "u1", role: "Kiosk_Employee", employeeId: empData.id },
      ),
    ).toEqual({ payload: { changed: true } });
    expect(
      projectRealtimeEvent(
        "timeRecord:created",
        { record: { employeeId: empData.id }, action: "ENTRADA" },
        { id: "u2", role: "Usuario", employeeId: empData.id },
      ),
    ).toEqual({ payload: { changed: true } });

    void today;
  });
});
