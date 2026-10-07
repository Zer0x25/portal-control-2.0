import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createFastifyRuntime } from "../../src/fastify/runtime";
import { prismaDirect } from "../../src/services/db";
import { AuthService } from "../../src/services/AuthService";
import { getChileDateISO } from "../../src/utils/timeUtils";
import { assertConnectedToTestDb, resetIntegrationDb } from "../integration/_support/testDb";
import { httpClient } from "./_support/http";
let fastify: FastifyInstance, token: string, actorId: string;
const employee = {
  id: "kpi-emp",
  name: "KPI Employee",
  rut: "12345678-9",
  position: "Operator",
  area: "Ops",
  workdayType: "Ordinaria",
  pin: "secret-pin",
};
const today = () => getChileDateISO(new Date());
const range = (date = today()) => ({ startDate: date, endDate: date });
const routes = [
  ["POST", "/api/kpis/summary"],
  ["POST", "/api/kpis/detailed-report"],
  ["GET", "/api/kpis/overview"],
  ["GET", "/api/kpis/daily-planning"],
] as const;
async function seedRecord(date: string) {
  await prismaDirect.employee.create({ data: employee });
  return prismaDirect.timeRecord.create({
    data: {
      employeeId: employee.id,
      employeeName: employee.name,
      date,
      entrada: `${date}T12:00:00.000Z`,
      salida: `${date}T20:00:00.000Z`,
      status: "Completado",
      scheduledStartTime: "09:00",
      scheduledEndTime: "17:00",
      scheduledHours: 8,
      scheduledColacionMinutes: 0,
    },
  });
}
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
  const actor = await prismaDirect.user.create({
    data: { username: "kpi-admin", role: "Administrador", passwordHash: "test-only" },
  });
  actorId = actor.id;
  token = (
    await AuthService.createSession(actor.id, actor.username, actor.role, undefined, "spec018")
  ).token;
});
afterAll(async () => {
  await resetIntegrationDb();
  await fastify.close();
});
describe.each(["Express", "Fastify"] as const)("Spec 018 KPI on %s", (server) => {
  const http = httpClient(
    server,
    () => fastify,
    () => token,
  );
  it("preserves empty response contracts without extra envelopes", async () => {
    expect((await http("POST", "/api/kpis/summary", range())).body).toEqual({
      kpis: {},
      kpiDetails: {},
    });
    expect((await http("POST", "/api/kpis/detailed-report", range())).body).toEqual({
      summary: [],
      details: {},
    });
    const overview = await http("GET", "/api/kpis/overview");
    expect(overview.status).toBe(200);
    expect(overview.body).toEqual({
      teamStatus: { present: 0, total: 0, anomalies: [], presentRecords: [] },
      employeeStatuses: [],
      timestamp: expect.any(String),
    });
    expect((await http("GET", "/api/kpis/daily-planning")).body).toEqual({
      onVacation: 0,
      onMedicalLeave: 0,
      onSpecialPermit: 0,
      onDayOff: 0,
      scheduled: 0,
      activeCount: 0,
    });
  });
  it("calculates snapshot hours, filters area/IDs and honors exclusive precedence", async () => {
    await seedRecord(today());
    const details = await http("POST", "/api/kpis/detailed-report", range());
    expect(details.status).toBe(200);
    expect(details.body.summary[0]).toMatchObject({
      employeeId: employee.id,
      totalHoursWorked: 8,
      totalHoursScheduled: 8,
      workedDays: 1,
    });
    expect(details.body.details[employee.id]).toHaveLength(1);
    expect(details.body.details[employee.id][0]).toMatchObject({
      isoDate: today(),
      workedHours: 8,
      scheduledHours: 8,
    });
    const summary = await http("POST", "/api/kpis/summary", range());
    expect(summary.status).toBe(200);
    expect(summary.body.kpis.totalWorkedHours).toBe(8);
    expect(
      (await http("POST", "/api/kpis/summary", { ...range(), area: "Other" })).body.kpis,
    ).toEqual({});
    expect(
      (await http("POST", "/api/kpis/detailed-report", { ...range(), employeeIds: ["missing"] }))
        .body.summary,
    ).toEqual([]);
    expect(
      (await http("POST", "/api/kpis/detailed-report", { ...range(), endDateExclusive: today() }))
        .status,
    ).toBe(400);
    expect(await prismaDirect.monthlyEmployeeStats.count()).toBe(0);
  });
  it("validates ranges/body types and characterizes regex-only calendar validation", async () => {
    for (const payload of [
      {},
      { startDate: "not-a-date", endDate: "2026-03-01" },
      { startDate: "2026-01-02", endDate: "2026-01-01" },
      { startDate: "2020-01-01", endDate: "2022-01-01" },
      { ...range(), employeeIds: "invalid" },
    ]) {
      for (const url of ["/api/kpis/summary", "/api/kpis/detailed-report"])
        expect((await http("POST", url, payload)).status).toBe(400);
    }
    // Existing date schema checks shape only; nonexistent calendar dates remain legacy debt.
    for (const url of ["/api/kpis/summary", "/api/kpis/detailed-report"])
      expect(
        (await http("POST", url, { startDate: "2026-02-30", endDate: "2026-03-01" })).status,
      ).toBe(200);
    expect(
      (
        await http("POST", "/api/kpis/summary", {
          startDate: "2020-01-01",
          endDate: "2024-01-01",
          employeeIds: ["missing"],
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await http("POST", "/api/kpis/summary", {
          startDate: "2020-01-01",
          endDate: "2024-01-01",
          employeeId: "missing",
        })
      ).status,
    ).toBe(400);
    expect(await prismaDirect.monthlyEmployeeStats.count()).toBe(0);
  });
  it("materializes locked monthly cache and reuses it after source changes", async () => {
    const record = await seedRecord("2020-01-06");
    const first = await http("POST", "/api/kpis/detailed-report", range("2020-01-06"));
    expect(first.status).toBe(200);
    expect(first.body.summary[0].totalHoursWorked).toBe(8);
    expect(await prismaDirect.monthlyEmployeeStats.count()).toBe(1);
    await prismaDirect.timeRecord.update({
      where: { id: record.id },
      data: { salida: "2020-01-06T22:00:00.000Z" },
    });
    const next = await http("POST", "/api/kpis/detailed-report", range("2020-01-06"));
    expect(next.body).toEqual(first.body);
    await prismaDirect.monthlyEmployeeStats.updateMany({ data: { dailyBreakdown: "not-json" } });
    expect((await http("POST", "/api/kpis/summary", range("2020-01-06"))).status).toBe(500);
    expect(await prismaDirect.monthlyEmployeeStats.count()).toBe(1);
  });
  it("returns 500 on actual cache write failure without inserting partial cache", async () => {
    await seedRecord("2020-01-06");
    await prismaDirect.$executeRaw`CREATE FUNCTION test_kpi_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'spec018 cache failed'; END; $$`;
    await prismaDirect.$executeRaw`CREATE TRIGGER test_kpi_fail BEFORE INSERT ON monthly_employee_stats FOR EACH ROW EXECUTE FUNCTION test_kpi_fail()`;
    try {
      expect((await http("POST", "/api/kpis/summary", range("2020-01-06"))).status).toBe(500);
      expect(await prismaDirect.monthlyEmployeeStats.count()).toBe(0);
    } finally {
      await prismaDirect.$executeRaw`DROP TRIGGER test_kpi_fail ON monthly_employee_stats`;
      await prismaDirect.$executeRaw`DROP FUNCTION test_kpi_fail()`;
    }
  });
  it("omits PIN from overview and absence details while preserving planning counts", async () => {
    await prismaDirect.employee.create({ data: employee });
    await prismaDirect.timeRecord.create({
      data: {
        employeeId: employee.id,
        employeeName: employee.name,
        date: today(),
        status: "Ausente",
        scheduledHours: 8,
      },
    });
    const overview = await http("GET", "/api/kpis/overview");
    expect(overview.status).toBe(200);
    expect(overview.body.employeeStatuses[0].employee.id).toBe(employee.id);
    expect(overview.body.employeeStatuses[0].employee).not.toHaveProperty("pin");
    const summary = await http("POST", "/api/kpis/summary", range());
    expect(summary.status).toBe(200);
    // Legacy explicit Ausente normalizes to 'Ausencia no justificada', so the aggregator omits it.
    expect(JSON.stringify(summary.body)).not.toContain("secret-pin");
    expect((await http("GET", "/api/kpis/daily-planning")).body.activeCount).toBe(1);
  });
  it("allows Reloj_Control on every route", async () => {
    await prismaDirect.user.update({ where: { id: actorId }, data: { role: "Reloj_Control" } });
    for (const [method, url] of routes)
      expect((await http(method, url, method === "POST" ? range() : undefined)).status).toBe(200);
  });
  it.each(routes)("enforces persisted sessions and roles on %s %s", async (method, url) => {
    const body = method === "POST" ? range() : undefined;
    expect((await http(method, url, body, null)).status).toBe(401);
    await prismaDirect.user.update({ where: { id: actorId }, data: { role: "Usuario" } });
    expect((await http(method, url, body)).status).toBe(403);
    expect(await prismaDirect.monthlyEmployeeStats.count()).toBe(0);
  });
});
