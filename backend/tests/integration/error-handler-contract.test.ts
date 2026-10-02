import { describe, expect, it } from "vitest";
import { errorHandler } from "../../src/middleware/errorHandler";
import { setupMFA } from "../../src/controllers/authController";
import { getConfig } from "../../src/controllers/configController";
import { getEmployeeScheduleForDate } from "../../src/controllers/shiftController";
import { createBulkRecords } from "../../src/controllers/timeRecordController";
import { updateCorrectionRequestStatus } from "../../src/controllers/correctionController";

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

const invokeWithGlobalErrorHandler = async (handler: any, req: any) => {
  const res = createMockRes();
  const next = (err?: any) => {
    if (err) {
      errorHandler(
        err,
        {
          method: req.method || "GET",
          path: req.path || "/test",
          headers: req.headers || {},
          ip: req.ip || "127.0.0.1",
        } as any,
        res as any,
        (() => {}) as any,
      );
    }
  };

  await handler(req, res as any, next as any);
  return res;
};

describe("Global Error Handler Contract", () => {
  it("returns UNAUTHORIZED shape for auth errors", async () => {
    const res = await invokeWithGlobalErrorHandler(setupMFA, {
      method: "POST",
      path: "/api/auth/mfa/setup",
      body: {},
    });

    expect(res.statusCode).toBe(401);
    expect(res.body?.success).toBe(false);
    expect(res.body?.code).toBe("UNAUTHORIZED");
    expect(typeof res.body?.message).toBe("string");
  });

  it("returns VALIDATION_ERROR shape for config validation", async () => {
    const res = await invokeWithGlobalErrorHandler(getConfig, {
      method: "GET",
      path: "/api/config/:key",
      params: {},
      user: { role: "Supervisor" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.body?.success).toBe(false);
    expect(res.body?.code).toBe("VALIDATION_ERROR");
    expect(typeof res.body?.message).toBe("string");
  });

  it("returns VALIDATION_ERROR shape for shifts validation", async () => {
    const res = await invokeWithGlobalErrorHandler(getEmployeeScheduleForDate, {
      method: "GET",
      path: "/api/shifts/schedule/employee/:id",
      params: { id: "emp-1" },
      query: {},
      user: { role: "Supervisor" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.body?.success).toBe(false);
    expect(res.body?.code).toBe("VALIDATION_ERROR");
    expect(typeof res.body?.message).toBe("string");
  });

  it("returns VALIDATION_ERROR shape for bulk records input", async () => {
    const res = await invokeWithGlobalErrorHandler(createBulkRecords, {
      method: "POST",
      path: "/api/time-records/bulk",
      body: { invalid: true },
      user: { username: "SYSTEM" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.body?.success).toBe(false);
    expect(res.body?.code).toBe("VALIDATION_ERROR");
    expect(typeof res.body?.message).toBe("string");
  });

  it("returns VALIDATION_ERROR shape for correction invalid ID", async () => {
    const res = await invokeWithGlobalErrorHandler(updateCorrectionRequestStatus, {
      method: "PATCH",
      path: "/api/corrections/:id",
      params: {},
      body: {},
    });

    expect(res.statusCode).toBe(400);
    expect(res.body?.success).toBe(false);
    expect(res.body?.code).toBe("VALIDATION_ERROR");
    expect(typeof res.body?.message).toBe("string");
  });
});
