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
});
