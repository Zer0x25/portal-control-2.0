import { describe, expect, it, vi } from "vitest";
import { validate } from "../../src/middleware/validate";
import { ShiftReportSchema } from "../../src/models/schemas";
import { errorHandler } from "../../src/middleware/errorHandler";

type MockResponse = {
  statusCode: number;
  body: any;
  headersSent: boolean;
  status: (code: number) => MockResponse;
  json: (payload: any) => MockResponse;
};

const createMockRes = (): MockResponse => {
  const res = {
    statusCode: 200,
    body: null,
    headersSent: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      this.headersSent = true;
      return this;
    },
  };
  return res;
};

const validPayload = {
  id: "sr-1",
  folio: "001",
  date: "2026-02-23",
  shiftName: "DIA",
  responsibleUser: "supervisor",
  startTime: "2026-02-23T08:00:00.000Z",
  endTime: "2026-02-23T20:00:00.000Z",
  status: "closed",
  logEntries: [
    {
      id: "log-1",
      time: "08:00",
      annotation: "Inicio de Turno",
      timestamp: 1766620800000,
    },
  ],
  supplierEntries: [
    {
      id: "sup-1",
      time: "10:00",
      licensePlate: "AA-BB-11",
      driverName: "Conductor",
      paxCount: 2,
      company: "Proveedor",
      reason: "Entrega",
      timestamp: 1766628000000,
    },
  ],
};

describe("POST /api/shift-reports Validation Contract", () => {
  it("accepts canonical payload shape", async () => {
    const req = { body: validPayload } as any;
    const res = createMockRes();
    const next = vi.fn();
    const middleware = validate(ShiftReportSchema);

    await middleware(req, res as any, next as any);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects legacy log entry payload shape", async () => {
    const req = {
      method: "POST",
      path: "/api/shift-reports",
      headers: {},
      ip: "127.0.0.1",
      body: {
        ...validPayload,
        logEntries: [{ id: "old-1", detail: "Legacy", timestamp: "2026-02-23T08:00:00.000Z" }],
      },
    } as any;

    const res = createMockRes();
    const middleware = validate(ShiftReportSchema);

    await middleware(req, res as any, (err?: any) => {
      if (err) errorHandler(err, req, res as any, (() => {}) as any);
    });

    expect(res.statusCode).toBe(400);
    expect(res.body?.success).toBe(false);
    expect(res.body?.code).toBe("VALIDATION_ERROR");
  });
});
