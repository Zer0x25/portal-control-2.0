import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ulid } from "ulid";

const hooks = vi.hoisted(() => ({ beforeTransaction: async () => {} }));
vi.mock("../../src/services/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/services/db")>();
  return {
    ...actual,
    withDirectTransaction: async (...args: Parameters<typeof actual.withDirectTransaction>) => {
      await hooks.beforeTransaction();
      return actual.withDirectTransaction(...args);
    },
  };
});
vi.mock("../../src/services/EmailService", () => ({
  EmailService: class {
    notifyTimeRecordAutoClose = vi.fn().mockResolvedValue(undefined);
  },
}));

import prisma, { withDirectTransaction } from "../../src/services/db";
import { processAutoClosures } from "../../src/services/autoCloseService";
import { TimeRecordService } from "../../src/services/TimeRecordService";
import { SocketService } from "../../src/services/socketService";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const entries = [
  ["job", processAutoClosures],
  ["manual", () => TimeRecordService.processAutoClosures()],
] as const;

const employeeIds: string[] = [];

async function createRecord() {
  const employeeId = ulid();
  employeeIds.push(employeeId);
  await prisma.employee.create({
    data: {
      id: employeeId,
      name: "AC3 QA",
      rut: `${employeeId.slice(-8)}-0`,
      position: "QA",
      area: "QA",
      workdayType: "Normal",
      status: "Activo",
    },
  });
  return prisma.timeRecord.create({
    data: {
      employeeId,
      employeeName: "AC3 QA",
      date: "2026-01-01",
      entrada: new Date(Date.now() - 15 * 3600000).toISOString(),
      status: "Laborando",
      source: "TEST_SUITE",
    },
  });
}

beforeEach(() => {
  hooks.beforeTransaction = async () => {};
});
afterEach(async () => {
  hooks.beforeTransaction = async () => {};
  await prisma.timeRecord.deleteMany({ where: { employeeId: { in: employeeIds } } });
  await prisma.employee.deleteMany({ where: { id: { in: employeeIds } } });
  employeeIds.length = 0;
  vi.restoreAllMocks();
});
afterAll(async () => {
  await prisma.$disconnect();
});

it("commits each employee independently and retries the remaining one after a failure", async () => {
  const first = await createRecord();
  const second = await createRecord();
  let transactions = 0;
  hooks.beforeTransaction = async () => {
    if (++transactions === 2) throw new Error("simulated transaction failure");
  };
  await expect(processAutoClosures()).rejects.toThrow("simulated transaction failure");
  const afterFailure = await prisma.timeRecord.findMany({
    where: { id: { in: [first.id, second.id] } },
  });
  expect(afterFailure.filter((record) => record.status === "AnomaliaManual")).toHaveLength(1);
  hooks.beforeTransaction = async () => {};
  expect(await processAutoClosures()).toBe(1);
  const afterRetry = await prisma.timeRecord.findMany({
    where: { id: { in: [first.id, second.id] } },
  });
  expect(afterRetry.every((record) => record.status === "AnomaliaManual")).toBe(true);
  for (const record of [first, second]) {
    expect(
      await prisma.auditLog.count({
        where: { action: "Cierre Automático de Turno", details: { string_contains: record.id } },
      }),
    ).toBe(1);
  }
});

it("rolls back hash audit and emits no invalidation when closure audit fails", async () => {
  const record = await createRecord();
  const emit = vi.spyOn(SocketService, "emitToAll");
  await prisma.$executeRaw`CREATE FUNCTION test_autoclose_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'Cierre Automático de Turno' THEN RAISE EXCEPTION 'test audit failure'; END IF; RETURN NEW; END; $$`;
  await prisma.$executeRaw`CREATE TRIGGER test_autoclose_audit_failure BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION test_autoclose_audit_failure()`;
  try {
    await expect(processAutoClosures()).rejects.toThrow();
    const unchanged = await prisma.timeRecord.findUniqueOrThrow({ where: { id: record.id } });
    expect(unchanged.status).toBe("Laborando");
    expect(unchanged.integrityHash).toBeNull();
    expect(
      await prisma.auditLog.count({
        where: {
          action: { in: ["TIME_RECORD_HASH_CREATED", "TIME_RECORD_HASH_UPDATED"] },
          details: { path: ["recordId"], equals: record.id },
        },
      }),
    ).toBe(0);
    expect(emit).not.toHaveBeenCalled();
  } finally {
    await prisma.$executeRaw`DROP TRIGGER test_autoclose_audit_failure ON audit_logs`;
    await prisma.$executeRaw`DROP FUNCTION test_autoclose_audit_failure()`;
  }
  expect(await processAutoClosures()).toBe(1);
  expect(emit.mock.calls.map(([event]) => event)).toEqual([
    "auditLog:created",
    "auditLog:created",
    "timeRecord:updated",
  ]);
});

describe.each(entries)("auto-close %s concurrency", (_label, close) => {
  it("preserves a completed punch committed after candidate selection", async () => {
    const record = await createRecord();
    const selected = deferred();
    const proceed = deferred();
    hooks.beforeTransaction = async () => {
      selected.resolve();
      await proceed.promise;
    };
    const closing = close();
    await selected.promise;
    hooks.beforeTransaction = async () => {};
    const salida = new Date().toISOString();
    await withDirectTransaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"punch:" + record.employeeId}))`;
      await tx.timeRecord.update({
        where: { id: record.id },
        data: { salida, status: "Completado" },
      });
    });
    proceed.resolve();
    expect(await closing).toBe(0);
    const result = await prisma.timeRecord.findUniqueOrThrow({ where: { id: record.id } });
    expect(result.salida).toBe(salida);
    expect(result.status).toBe("Completado");
    expect(
      await prisma.auditLog.count({
        where: { action: "Cierre Automático de Turno", details: { string_contains: record.id } },
      }),
    ).toBe(0);
  });

  it("closes and audits only once when two calls select the same record", async () => {
    const record = await createRecord();
    const bothSelected = deferred();
    const proceed = deferred();
    let selected = 0;
    hooks.beforeTransaction = async () => {
      if (++selected === 2) bothSelected.resolve();
      await proceed.promise;
    };
    const first = close();
    const second = close();
    await bothSelected.promise;
    proceed.resolve();
    expect((await Promise.all([first, second])).sort()).toEqual([0, 1]);
    const result = await prisma.timeRecord.findUniqueOrThrow({ where: { id: record.id } });
    expect(result.status).toBe("AnomaliaManual");
    expect(result.salida).toBeNull();
    expect(
      await prisma.auditLog.count({
        where: { action: "Cierre Automático de Turno", details: { string_contains: record.id } },
      }),
    ).toBe(1);
  });
});
