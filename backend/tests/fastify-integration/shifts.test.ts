import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { createFastifyRuntime } from "../../src/fastify/runtime";
import { prismaDirect } from "../../src/services/db";
import { AuthService } from "../../src/services/AuthService";
import { EmailService } from "../../src/services/EmailService";
import { SocketService } from "../../src/services/socketService";
import { schedulingService } from "../../src/services/schedulingService";
import { getChileDateISO, addBusinessDaysChile } from "../../src/utils/timeUtils";
import { assertConnectedToTestDb, resetIntegrationDb } from "../integration/_support/testDb";
import { httpClient } from "./_support/http";
let fastify: FastifyInstance, token: string, actorId: string;
const employee = {
  id: "shift-emp",
  name: "Shift Employee",
  rut: "12345678-9",
  position: "Operator",
  area: "Ops",
  workdayType: "Artículo 22",
};
const today = () => getChileDateISO(new Date());
const plus = (n: number) => addBusinessDaysChile(today(), n);
const pattern = {
  id: "shift-pattern",
  name: "Work Rest Pattern",
  cycleLengthDays: 7,
  startDayOfWeek: 0,
  color: "#0099AA",
  maxHoursPattern: 40,
  worksOnHolidays: true,
  dailySchedules: Array.from({ length: 7 }, (_, dayIndex) => ({
    dayIndex,
    isOffDay: dayIndex >= 5,
    startTime: dayIndex < 5 ? "09:00" : null,
    endTime: dayIndex < 5 ? "17:00" : null,
    hasColacion: false,
    hours: dayIndex < 5 ? 8 : 0,
  })),
};
const yearMonth = () => {
  const [year, month] = today().split("-").map(Number);
  const future = new Date(Date.UTC(year, month, 1));
  return {
    year: String(future.getUTCFullYear()),
    month: String(future.getUTCMonth() + 1),
    start: `${future.getUTCFullYear()}-${String(future.getUTCMonth() + 1).padStart(2, "0")}-01`,
  };
};
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
  await prismaDirect.employee.create({ data: employee });
  const actor = await prismaDirect.user.create({
    data: {
      username: "shifts-admin",
      role: "Administrador",
      passwordHash: "test-only",
      employeeId: employee.id,
    },
  });
  actorId = actor.id;
  token = (
    await AuthService.createSession(actor.id, actor.username, actor.role, employee.id, "shift-test")
  ).token;
  vi.spyOn(SocketService, "emit").mockImplementation(() => {});
  vi.spyOn(EmailService.prototype, "notifyTardiness").mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await resetIntegrationDb();
  await fastify.close();
});
const routes = [
  ["GET", "/api/shifts/patterns", false],
  ["POST", "/api/shifts/patterns", true],
  ["PUT", "/api/shifts/patterns/missing", true],
  ["DELETE", "/api/shifts/patterns/missing", true],
  ["POST", "/api/shifts/patterns/bulk", true],
  ["GET", "/api/shifts/assignments", false],
  ["POST", "/api/shifts/assignments", true],
  ["PUT", "/api/shifts/assignments/missing", true],
  ["DELETE", "/api/shifts/assignments/missing", true],
  ["POST", "/api/shifts/assignments/bulk", true],
  ["GET", "/api/shifts/schedule/employee/shift-emp", false],
  ["GET", "/api/shifts/schedule/employees-on-date", true],
  ["GET", "/api/shifts/schedule/employee/shift-emp/month", false],
  ["POST", "/api/shifts/schedule/matrix", false],
  ["GET", "/api/shifts/monthly-plan/shift-emp/2026/11", true],
  ["POST", "/api/shifts/monthly-plan", true],
  ["GET", "/api/shifts/suggest-pattern-name", true],
  ["POST", "/api/shifts/validate-conflicts", true],
] as const;
describe.each(["Express", "Fastify"] as const)("Spec 015 shifts on %s", (server) => {
  const http = httpClient(
    server,
    () => fastify,
    () => token,
  );
  const assignment = (extra: Record<string, unknown> = {}) => ({
    id: "shift-assignment",
    employeeId: employee.id,
    shiftPatternId: pattern.id,
    startDate: today(),
    endDate: plus(1),
    ...extra,
  });
  async function setup() {
    const p = await http("POST", "/api/shifts/patterns", pattern);
    expect(p.status).toBe(201);
    const a = await http("POST", "/api/shifts/assignments", assignment());
    expect(a.status).toBe(201);
    return { p, a };
  }
  it("creates/updates/paginates patterns and preserves archive/delta/idempotent delete", async () => {
    const created = await http("POST", "/api/shifts/patterns", pattern);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ id: pattern.id, syncStatus: "synced", isDeleted: false });
    expect(created.body.dailySchedules).toHaveLength(7);
    const updated = await http("PUT", `/api/shifts/patterns/${pattern.id}`, {
      name: "Renamed Pattern",
    });
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe("Renamed Pattern");
    const list = await http("GET", "/api/shifts/patterns?page=1&pageSize=10&search=Renamed");
    expect(list.status).toBe(200);
    expect(list.body.meta).toMatchObject({ total: 1, page: 1, pageSize: 10, totalPages: 1 });
    expect((await http("GET", `/api/shifts/patterns?since=${Date.now() + 60000}`)).body).toEqual(
      [],
    );
    expect((await http("DELETE", `/api/shifts/patterns/${pattern.id}`)).status).toBe(204);
    expect((await http("GET", "/api/shifts/patterns")).body).toEqual([]);
    expect((await http("GET", "/api/shifts/patterns?showArchived=true")).body[0].isDeleted).toBe(
      true,
    );
    expect((await http("DELETE", "/api/shifts/patterns/missing")).status).toBe(204);
  });
  it("creates/updates/deletes assignments and records actor/events with existing pagination", async () => {
    const { a } = await setup();
    expect(a.body).toMatchObject({
      id: "shift-assignment",
      employeeName: employee.name,
      shiftPatternName: pattern.name,
    });
    expect(
      (await http("PUT", `/api/shifts/assignments/${a.body.id}`, { endDate: plus(2) })).status,
    ).toBe(200);
    const list = await http(
      "GET",
      `/api/shifts/assignments?employeeId=${employee.id}&page=1&pageSize=10`,
    );
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.meta.total).toBe(1);
    expect((await http("DELETE", `/api/shifts/assignments/${a.body.id}`)).status).toBe(204);
    expect(
      (await prismaDirect.assignedShift.findUniqueOrThrow({ where: { id: a.body.id } })).isDeleted,
    ).toBe(true);
    expect((await http("DELETE", "/api/shifts/assignments/missing")).status).toBe(404);
    expect(vi.mocked(SocketService.emit)).toHaveBeenCalledWith("assignedShift:updated", {
      id: a.body.id,
    });
    expect(
      await prismaDirect.auditLog.count({ where: { actorUsername: "shifts-admin" } }),
    ).toBeGreaterThan(0);
  });
  it("detects conflicts and permits a boundary assignment on the day after endDate", async () => {
    await setup();
    const conflicts = await http("POST", "/api/shifts/validate-conflicts", {
      employeeId: employee.id,
      startDate: plus(1),
      endDate: plus(2),
    });
    expect(conflicts.status).toBe(200);
    expect(conflicts.body.hasConflicts).toBe(true);
    expect(conflicts.body.conflicts).toHaveLength(1);
    expect(
      (
        await http(
          "POST",
          "/api/shifts/assignments",
          assignment({ id: "overlap", startDate: plus(1), endDate: plus(2) }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await http(
          "POST",
          "/api/shifts/assignments",
          assignment({ id: "boundary", startDate: plus(2), endDate: plus(3) }),
        )
      ).status,
    ).toBe(201);
    const excluding = await http("POST", "/api/shifts/validate-conflicts", {
      employeeId: employee.id,
      startDate: today(),
      endDate: plus(1),
      excludeAssignmentId: "shift-assignment",
    });
    expect(excluding.body.hasConflicts).toBe(false);
  });
  it("rejects schedule errors and validates every row of both bulk surfaces before writes", async () => {
    const bad = { ...pattern, dailySchedules: [{ dayIndex: 0, isOffDay: false }] };
    expect((await http("POST", "/api/shifts/patterns", bad)).status).toBe(400);
    const patterns = Array.from({ length: 50 }, (_, i) => ({
      ...pattern,
      id: `p-${i}`,
      name: `Pattern ${i}`,
    }));
    expect(
      (await http("POST", "/api/shifts/patterns/bulk", [...patterns, { ...pattern, name: "x" }]))
        .status,
    ).toBe(400);
    expect(await prismaDirect.shiftPattern.count()).toBe(0);
    const created = await http("POST", "/api/shifts/patterns/bulk", [
      pattern,
      { ...pattern, id: "p-extra", name: "Extra Pattern" },
    ]);
    expect(created.status).toBe(201);
    expect(created.body).toEqual({ count: 2 });
    const assignments = Array.from({ length: 50 }, (_, i) =>
      assignment({ id: `a-${i}`, employeeId: `e-${i}` }),
    );
    expect(
      (
        await http("POST", "/api/shifts/assignments/bulk", [
          ...assignments,
          assignment({ startDate: "bad" }),
        ])
      ).status,
    ).toBe(400);
    expect(await prismaDirect.assignedShift.count()).toBe(0);
    const bulk = await http("POST", "/api/shifts/assignments/bulk", [assignment()]);
    expect(bulk.status).toBe(201);
    expect(bulk.body).toEqual({ count: 1 });
    const overlap = await http("POST", "/api/shifts/assignments/bulk", [
      assignment({ id: "overlap" }),
    ]);
    expect(overlap.status).toBe(400);
    expect(await prismaDirect.assignedShift.count()).toBe(1);
  });
  it("scopes linked Usuario calendar/assignments/matrix and explicitly rejects unlinked matrix", async () => {
    await setup();
    await prismaDirect.employee.create({ data: { ...employee, id: "foreign", rut: "22222222-2" } });
    await prismaDirect.assignedShift.create({
      data: {
        employeeId: "foreign",
        shiftPatternId: pattern.id,
        startDate: today(),
        endDate: plus(1),
      },
    });
    await prismaDirect.user.update({ where: { id: actorId }, data: { role: "Usuario" } });
    const list = await http("GET", "/api/shifts/assignments?employeeId=foreign");
    expect(list.status).toBe(200);
    expect(list.body.data.map((a: { employeeId: string }) => a.employeeId)).toEqual([employee.id]);
    expect(
      (await http("GET", `/api/shifts/schedule/employee/foreign?date=${today()}`)).status,
    ).toBe(403);
    const [year, month] = today().split("-");
    expect(
      (await http("GET", `/api/shifts/schedule/employee/foreign/month?year=${year}&month=${month}`))
        .status,
    ).toBe(403);
    const own = await http("GET", `/api/shifts/schedule/employee/${employee.id}?date=${today()}`);
    expect(own.status).toBe(200);
    expect(own.body.isWorkDay).toBe(true);
    expect(
      (
        await http(
          "GET",
          `/api/shifts/schedule/employee/${employee.id}/month?year=${year}&month=${month}`,
        )
      ).status,
    ).toBe(200);
    const matrix = await http("POST", "/api/shifts/schedule/matrix", {
      startDate: today(),
      endDate: plus(1),
      employeeIds: ["foreign"],
    });
    expect(matrix.status).toBe(200);
    expect(Object.keys(matrix.body)).toEqual([employee.id]);
    await prismaDirect.user.update({ where: { id: actorId }, data: { employeeId: null } });
    expect(
      (
        await http("POST", "/api/shifts/schedule/matrix", {
          startDate: today(),
          endDate: plus(1),
          employeeIds: ["foreign"],
        })
      ).status,
    ).toBe(403);
  });
  it("serves scheduled employees, manual query errors and monthly name suggestion", async () => {
    await setup();
    const scheduled = await http("GET", `/api/shifts/schedule/employees-on-date?date=${today()}`);
    expect(scheduled.status).toBe(200);
    expect(
      scheduled.body.some((row: { employeeId: string }) => row.employeeId === employee.id),
    ).toBe(true);
    expect((await http("GET", "/api/shifts/schedule/employees-on-date")).status).toBe(400);
    expect((await http("GET", `/api/shifts/schedule/employee/${employee.id}`)).status).toBe(400);
    expect(
      (await http("GET", `/api/shifts/schedule/employee/${employee.id}/month?year=bad&month=11`))
        .status,
    ).toBe(400);
    expect((await http("GET", `/api/shifts/monthly-plan/${employee.id}/bad/11`)).status).toBe(400);
    expect((await http("GET", "/api/shifts/suggest-pattern-name")).status).toBe(400);
    const future = yearMonth();
    const suggested = await http(
      "GET",
      `/api/shifts/suggest-pattern-name?employeeId=${employee.id}&year=${future.year}&month=${future.month}`,
    );
    expect(suggested.status).toBe(200);
    expect(typeof suggested.body.suggestedName).toBe("string");
  });
  it("saves/reads future monthly plan with work/rest days and rejects past month", async () => {
    const future = yearMonth();
    const plan = {
      employeeId: employee.id,
      year: future.year,
      month: future.month,
      patternName: "Future Monthly Pattern",
      dailySchedules: [
        { day: 1, type: "work", startTime: "09:00", endTime: "17:00", hours: 8 },
        { day: 2, type: "rest" },
      ],
    };
    const saved = await http("POST", "/api/shifts/monthly-plan", plan);
    expect(saved.status).toBe(200);
    expect(saved.body).toEqual({ success: true, message: "Monthly plan updated successfully" });
    const result = await http(
      "GET",
      `/api/shifts/monthly-plan/${employee.id}/${future.year}/${future.month}`,
    );
    expect(result.status).toBe(200);
    // Legacy monthly view queries midnight UTC: Santiago observes the preceding date.
    // Characterize parity explicitly; the daily endpoint reads the stored plan correctly.
    expect(result.body[0]).toMatchObject({ dateIso: future.start, isWorkDay: false });
    expect(result.body[1].isWorkDay).toBe(true);
    expect(result.body[2].isWorkDay).toBe(false);
    const dailyWork = await http(
      "GET",
      `/api/shifts/schedule/employee/${employee.id}?date=${future.start}`,
    );
    expect(dailyWork.body).toMatchObject({
      isWorkDay: true,
      startTime: "09:00",
      endTime: "17:00",
      hours: 8,
    });
    const dailyRest = await http(
      "GET",
      `/api/shifts/schedule/employee/${employee.id}?date=${addBusinessDaysChile(future.start, 1)}`,
    );
    expect(dailyRest.body.isWorkDay).toBe(false);
    const persisted = await prismaDirect.shiftPattern.findFirstOrThrow();
    expect(JSON.parse(String(persisted.dailySchedules)).slice(0, 2)).toMatchObject([
      { isOffDay: false, hours: 8 },
      { isOffDay: true, hours: 0 },
    ]);
    expect(
      (await http("POST", "/api/shifts/monthly-plan", { ...plan, year: "2020", month: "1" }))
        .status,
    ).toBe(400);
    expect(await prismaDirect.shiftPattern.count()).toBe(1);
  });
  it("rolls back previous assignments when pattern creation fails in monthly transaction", async () => {
    const future = yearMonth();
    await http("POST", "/api/shifts/patterns", pattern);
    const existing = await prismaDirect.assignedShift.create({
      data: {
        employeeId: employee.id,
        shiftPatternId: pattern.id,
        startDate: future.start,
        endDate: null,
      },
    });
    await prismaDirect.$executeRaw`CREATE FUNCTION test_monthly_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'monthly forced failure'; END $$`;
    await prismaDirect.$executeRaw`CREATE TRIGGER test_monthly_fail BEFORE INSERT ON shift_patterns FOR EACH ROW EXECUTE FUNCTION test_monthly_fail()`;
    try {
      const response = await http("POST", "/api/shifts/monthly-plan", {
        employeeId: employee.id,
        year: future.year,
        month: future.month,
        patternName: "Fail",
        dailySchedules: [],
      });
      expect(response.status).toBe(500);
      expect(await prismaDirect.assignedShift.findUnique({ where: { id: existing.id } })).toEqual(
        existing,
      );
      expect(await prismaDirect.shiftPattern.count()).toBe(1);
    } finally {
      await prismaDirect.$executeRaw`DROP TRIGGER test_monthly_fail ON shift_patterns`;
      await prismaDirect.$executeRaw`DROP FUNCTION test_monthly_fail()`;
    }
  });
  it("keeps calendar matrix batch-fetch bounded for multiple employees", async () => {
    await setup();
    await prismaDirect.employee.createMany({
      data: Array.from({ length: 10 }, (_, i) => ({
        ...employee,
        id: `matrix-${i}`,
        rut: `${10000000 + i}-0`,
      })),
    });
    const context = vi.spyOn(schedulingService, "getSchedulingContext");
    const daily = vi.spyOn(schedulingService, "getEmployeeDailyScheduleInfo");
    const response = await http("POST", "/api/shifts/schedule/matrix", {
      startDate: today(),
      endDate: plus(1),
      employeeIds: [employee.id, ...Array.from({ length: 10 }, (_, i) => `matrix-${i}`)],
    });
    expect(response.status).toBe(200);
    expect(Object.keys(response.body)).toHaveLength(11);
    expect(context).toHaveBeenCalledTimes(1);
    expect(daily.mock.calls.length).toBeGreaterThan(0);
    expect(daily.mock.calls.every(([, , cache]) => cache !== undefined)).toBe(true);
  });
  it("runs employee→pattern→assignment→punch with stored schedule snapshot and valid chain", async () => {
    const created = await http("POST", "/api/employees", {
      ...employee,
      createUserAccount: false,
      id: "EMP-BATCH",
      rut: "22222222-2",
    });
    expect(created.status).toBe(201);
    const p = await http("POST", "/api/shifts/patterns", pattern);
    expect(p.status).toBe(201);
    const a = await http(
      "POST",
      "/api/shifts/assignments",
      assignment({ employeeId: created.body.id, endDate: today() }),
    );
    expect(a.status).toBe(201);
    const daily = await http(
      "GET",
      `/api/shifts/schedule/employee/${created.body.id}?date=${today()}`,
    );
    expect(daily.status).toBe(200);
    expect(daily.body).toMatchObject({
      shiftPatternId: pattern.id,
      startTime: "09:00",
      endTime: "17:00",
      isWorkDay: true,
    });
    const punched = await http("POST", "/api/records/punch", {
      employeeId: created.body.id,
      forcedType: "entrada",
      source: "BATCH_TEST",
    });
    expect(punched.status).toBe(200);
    expect(punched.body.action).toBe("ENTRADA");
    const stored = await prismaDirect.timeRecord.findUniqueOrThrow({
      where: { id: punched.body.record.id },
    });
    expect(stored).toMatchObject({
      shiftPatternId: pattern.id,
      scheduledStartTime: "09:00",
      scheduledEndTime: "17:00",
      scheduledHours: 8,
    });
    expect(stored.integrityHash).toBeTruthy();
    const integrity = await http(
      "GET",
      `/api/records/integrity/verify?employeeId=${created.body.id}&from=${today()}&to=${today()}`,
    );
    expect(integrity.body.summary).toMatchObject({ checkedCount: 1, brokenCount: 0 });
  });
  it.each(routes)("enforces persisted access for %s %s", async (method, url, supervisor) => {
    const body = ["POST", "PUT"].includes(method) ? {} : undefined;
    expect((await http(method, url, body, null)).status).toBe(401);
    if (supervisor) {
      await prismaDirect.user.update({ where: { id: actorId }, data: { role: "Usuario" } });
      expect((await http(method, url, body)).status).toBe(403);
      expect(await prismaDirect.shiftPattern.count()).toBe(0);
      expect(await prismaDirect.assignedShift.count()).toBe(0);
      expect(vi.mocked(SocketService.emit)).not.toHaveBeenCalled();
    }
  });
});
