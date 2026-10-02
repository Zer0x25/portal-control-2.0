import { describe, it, expect } from "vitest";
import { exportReportPDF } from "../../src/controllers/exportController";

type MockResponse = {
  statusCode: number;
  body: any;
  status: (code: number) => MockResponse;
  json: (payload: any) => MockResponse;
};

const createMockRes = (): MockResponse => {
  const res = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return res;
};

describe("Export Security Flow", () => {
  it("denies Usuario when exporting report for another employeeId", async () => {
    const req = {
      user: {
        role: "Usuario",
        employeeId: "EMP-OWNER-001",
      },
      query: {
        startDate: "2026-02-01",
        endDate: "2026-02-11",
        employeeId: "EMP-OTHER-999",
        viewMode: "month",
      },
    } as any;
    const res = createMockRes();

    await exportReportPDF(req, res as any);

    expect(res.statusCode).toBe(403);
    expect(String(res.body?.message || "")).toContain("Acceso denegado");
  });
});
