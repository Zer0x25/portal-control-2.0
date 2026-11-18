import { describe, it, expect, vi, beforeEach } from "vitest";
import { timeRecordIntegrityService } from "../src/services/timeRecordIntegrityService";

vi.mock("../src/services/auditService", () => ({
  auditService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("timeRecordIntegrityService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should compute deterministic hashes for same payload", () => {
    const payload =
      "EMP001|2026-02-12|null|null|null|null|Abierto|SELF_SERVICE|2026-02-12T12:00:00.000Z|null|1";
    const hashA = timeRecordIntegrityService.computeHash(payload);
    const hashB = timeRecordIntegrityService.computeHash(payload);
    expect(hashA).toBe(hashB);
  });

  it("should change hash when salida changes", () => {
    const baseRecord = {
      employeeId: "EMP001",
      date: "2026-02-12",
      entrada: "2026-02-12T12:00:00.000Z",
      inicioColacion: null,
      finColacion: null,
      salida: "2026-02-12T20:00:00.000Z",
      status: "Completado",
      source: "SELF_SERVICE",
      updatedAt: new Date("2026-02-12T20:00:00.000Z"),
      integrityVersion: 1,
    } as any;

    const payloadA = timeRecordIntegrityService.buildCanonicalPayload(baseRecord, null);
    const hashA = timeRecordIntegrityService.computeHash(payloadA);

    const payloadB = timeRecordIntegrityService.buildCanonicalPayload(
      { ...baseRecord, salida: "2026-02-12T21:00:00.000Z" } as any,
      null,
    );
    const hashB = timeRecordIntegrityService.computeHash(payloadB);

    expect(hashA).not.toBe(hashB);
  });

  it("should verify prevHash chain for 3 records", async () => {
    const records = [
      {
        id: "r1",
        employeeId: "EMP001",
        date: "2026-02-10",
        entrada: "2026-02-10T12:00:00.000Z",
        inicioColacion: null,
        finColacion: null,
        salida: "2026-02-10T20:00:00.000Z",
        status: "Completado",
        source: "SELF_SERVICE",
        updatedAt: new Date("2026-02-10T20:00:00.000Z"),
        integrityVersion: 1,
      },
      {
        id: "r2",
        employeeId: "EMP001",
        date: "2026-02-11",
        entrada: "2026-02-11T12:00:00.000Z",
        inicioColacion: null,
        finColacion: null,
        salida: "2026-02-11T20:00:00.000Z",
        status: "Completado",
        source: "SELF_SERVICE",
        updatedAt: new Date("2026-02-11T20:00:00.000Z"),
        integrityVersion: 1,
      },
      {
        id: "r3",
        employeeId: "EMP001",
        date: "2026-02-12",
        entrada: "2026-02-12T12:00:00.000Z",
        inicioColacion: null,
        finColacion: null,
        salida: "2026-02-12T20:00:00.000Z",
        status: "Completado",
        source: "SELF_SERVICE",
        updatedAt: new Date("2026-02-12T20:00:00.000Z"),
        integrityVersion: 1,
      },
    ] as any[];

    let prev: string | null = null;
    const sealed = records.map((r) => {
      const expected = timeRecordIntegrityService.computeHash(
        timeRecordIntegrityService.buildCanonicalPayload(r, prev),
      );
      const next = { ...r, integrityPrevHash: prev, integrityHash: expected };
      prev = expected;
      return next;
    });

    const tx = {
      timeRecord: {
        findMany: vi.fn().mockResolvedValueOnce(sealed).mockResolvedValue([]),
      },
    } as any;

    const result = await timeRecordIntegrityService.verifyChain(tx, { employeeId: "EMP001" });
    expect(result.checkedCount).toBe(3);
    expect(result.brokenCount).toBe(0);
  });

  it("checks only matching rows and enforces a strict limit across batches", async () => {
    let previous: string | null = null;
    const records = Array.from({ length: 5002 }, (_, index) => {
      const row = {
        id: `r${index}`,
        employeeId: "EMP001",
        date: index === 0 || index === 5000 ? "2026-01-01" : "2026-02-01",
        entrada: null,
        inicioColacion: null,
        finColacion: null,
        salida: null,
        status: "Completado",
        source: "TEST",
        updatedAt: new Date("2026-01-01T00:00:00Z"),
        integrityVersion: 1,
      };
      const hash = timeRecordIntegrityService.computeHash(
        timeRecordIntegrityService.buildCanonicalPayload(row, previous),
      );
      const sealed = { ...row, integrityPrevHash: previous, integrityHash: hash };
      previous = hash;
      return sealed;
    });
    const tx = {
      timeRecord: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce(records.slice(0, 5000))
          .mockResolvedValueOnce(records.slice(5000))
          .mockResolvedValue([]),
      },
    } as any;
    const result = await timeRecordIntegrityService.verifyChain(tx, {
      employeeId: "EMP001",
      from: "2026-02-01",
      to: "2026-02-01",
      limit: 5000,
    });
    expect(result).toMatchObject({ checkedCount: 5000, brokenCount: 0, truncated: false });
    expect(tx.timeRecord.findMany).toHaveBeenCalledTimes(3);
    tx.timeRecord.findMany.mockReset().mockResolvedValueOnce(records.slice(0, 5000));
    const first = await timeRecordIntegrityService.verifyChain(tx, {
      from: "2026-02-01",
      limit: 1,
    });
    expect(first).toMatchObject({ checkedCount: 1, brokenCount: 0, truncated: true });
    await expect(timeRecordIntegrityService.verifyChain(tx, { limit: 0 })).rejects.toThrow(
      RangeError,
    );
  });
});
