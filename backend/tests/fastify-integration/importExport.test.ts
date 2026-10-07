import { auditService } from "../../src/services/auditService";
import jwt from "jsonwebtoken";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import request from "supertest";
import ExcelJS from "exceljs";
import { createFastifyRuntime } from "../../src/fastify/runtime";
import expressApp from "../../src/app";
import { prismaDirect } from "../../src/services/db";
import { AuthService } from "../../src/services/AuthService";
import { ExportService } from "../../src/services/export/ExportService";
import { streamExportService } from "../../src/services/export/StreamExportService";
import { kpiService } from "../../src/services/kpiService";
import { SocketService } from "../../src/services/socketService";
import { assertConnectedToTestDb, resetIntegrationDb } from "../integration/_support/testDb";
import { httpClient } from "./_support/http";
let fastify: FastifyInstance, token: string, actorId: string;
let ipNumber = 0,
  clientIP = "";
const employee = {
  id: "export-self",
  name: "Export Employee",
  rut: "12345678-9",
  area: "Ops",
  position: "Operator",
  workdayType: "Ordinaria",
  pin: "never-export-pin",
};
const query = "startDate=2020-01-01&endDate=2020-01-02";
async function workbook(empty = false) {
  const book = new ExcelJS.Workbook();
  if (!empty) {
    const sheet = book.addWorksheet("Data");
    sheet.addRow(["Name", "Value", "Flag", "Formula"]);
    sheet.addRow(["Ada", 0, false, { formula: "1+1", result: 2 }]);
    sheet.addRow(["Bob", null, true]);
  }
  return Buffer.from(await book.xlsx.writeBuffer());
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
  clientIP = "192.0.2." + ++ipNumber;
  const actor = await prismaDirect.user.create({
    data: { username: "export-admin", role: "Administrador", passwordHash: "test-only" },
  });
  actorId = actor.id;
  token = (
    await AuthService.createSession(actor.id, actor.username, actor.role, undefined, "spec021")
  ).token;
  vi.spyOn(SocketService, "emit").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await resetIntegrationDb();
  await fastify.close();
});
describe.each(["Express", "Fastify"] as const)("Spec021 import/export on %s", (server) => {
  const http = httpClient(
    server,
    () => fastify,
    () => token,
    () => ({ "x-forwarded-for": clientIP }),
  );
  async function upload(
    bytes?: Buffer,
    schema?: string,
    field = "file",
    access: string | null = token,
    duplicate = false,
    repeatSchema = false,
  ) {
    if (server === "Express") {
      let call = request(expressApp).post("/api/import/preview").set("x-forwarded-for", clientIP);
      if (access) call = call.set("authorization", `Bearer ${access}`);
      if (bytes)
        call = call.attach(field, bytes, {
          filename: "Data.bin",
          contentType: "application/octet-stream",
        });
      if (duplicate && bytes) call = call.attach(field, bytes, { filename: "Other.xlsx" });
      if (schema !== undefined) {
        call = call.field("schema", schema);
        if (repeatSchema) call = call.field("schema", schema);
      }
      const response = await call;
      return { status: response.status, body: response.body };
    }
    if (!bytes && schema === undefined) {
      const response = await fastify.inject({
        method: "POST",
        url: "/api/import/preview",
        headers: {
          "x-forwarded-for": clientIP,
          ...(access ? { authorization: `Bearer ${access}` } : {}),
        },
      });
      return { status: response.statusCode, body: response.json() };
    }
    const boundary = "spec021-upload-boundary";
    const parts: Buffer[] = [];
    if (bytes)
      for (let i = 0; i < (duplicate ? 2 : 1); i++)
        parts.push(
          Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="${field}"; filename="Data.bin"\r\nContent-Type: application/octet-stream\r\n\r\n`,
          ),
          bytes,
          Buffer.from("\r\n"),
        );
    if (schema !== undefined)
      for (let i = 0; i < (repeatSchema ? 2 : 1); i++)
        parts.push(
          Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="schema"\r\n\r\n${schema}\r\n`,
          ),
        );
    parts.push(Buffer.from(`--${boundary}--\r\n`));
    const response = await fastify.inject({
      method: "POST",
      url: "/api/import/preview",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
        "x-forwarded-for": clientIP,
        ...(access ? { authorization: `Bearer ${access}` } : {}),
      },
      payload: Buffer.concat(parts),
    });
    return { status: response.statusCode, body: response.json() };
  }
  async function worker(role = "Usuario", linked = true) {
    if (role === "quiosco") {
      token = jwt.sign(
        { id: "kiosk", username: "kiosk", role: "Kiosk_Employee", employeeId: "outside" },
        process.env.JWT_SECRET!,
        { expiresIn: "5m" },
      );
      return;
    }
    if (linked) await prismaDirect.employee.create({ data: employee });
    await prismaDirect.user.update({
      where: { id: actorId },
      data: { role, employeeId: linked ? employee.id : null },
    });
  }
  it("shares ten-export budget across routes including failed/no-auth requests, isolated by IP", async () => {
    for (let i = 0; i < 10; i++)
      expect(
        (
          await http(
            "GET",
            i % 2 ? "/api/export/calendar-pdf" : "/api/export/report-excel",
            undefined,
            null,
          )
        ).status,
      ).toBe(401);
    const blocked = await http("GET", "/api/export/report-pdf", undefined, null);
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({
      message: "Límite de exportaciones alcanzado. Intenta en 15 minutos.",
    });
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
    clientIP = "198.51.100." + ipNumber;
    expect((await http("GET", "/api/export/report-pdf", undefined, null)).status).toBe(401);
  });
  it("decodes real workbook including formulas/zero/false and maps all rows without persistence/events", async () => {
    const bytes = await workbook();
    const plain = await upload(bytes);
    expect(plain.status).toBe(200);
    expect(plain.body).toEqual({
      rows: [
        { Name: "Ada", Value: 0, Flag: false, Formula: { formula: "1+1", result: 2 } },
        { Name: "Bob", Flag: true },
      ],
      total: 2,
    });
    const mapped = await upload(
      bytes,
      JSON.stringify({
        Value: { prop: "value", type: "String" },
        Flag: { prop: "flag", type: "String" },
        Missing: { prop: "absent", type: "Number" },
      }),
    );
    expect(mapped.status).toBe(200);
    expect(mapped.body).toEqual({
      rows: [
        { value: "0", flag: "false" },
        { value: null, flag: "true" },
      ],
      total: 2,
    });
    expect(await prismaDirect.employee.count()).toBe(0);
    expect(await prismaDirect.timeRecord.count()).toBe(0);
    expect(SocketService.emit).not.toHaveBeenCalled();
  });
  it("rejects missing/corrupt/no-sheet workbook and rejects malformed mapping", async () => {
    expect((await upload()).body.message).toBe("No se subió ningún archivo");
    const corrupt = await upload(Buffer.from("bad zip"));
    expect(corrupt.status).toBe(400);
    expect(corrupt.body.message).toBe("El archivo no es un Excel válido");
    const empty = await upload(await workbook(true));
    expect(empty.status).toBe(400);
    expect(empty.body.message).toBe("El archivo Excel está vacío o no tiene hojas");
    expect((await upload(await workbook(), "{")).status).toBe(400);
    expect((await upload(undefined, "{")).status).toBe(400);
    expect((await upload(await workbook(), '{"Value":null}')).status).toBe(400);
    expect((await upload(await workbook(), "{}", "file", token, false, true)).status).toBe(400);
  });
  it("accepts the frontend mapping with required metadata", async () => {
    expect(
      (await upload(await workbook(), '{"Value":{"prop":"value","type":"String","required":true}}'))
        .status,
    ).toBe(200);
  });
  it.each([
    "[]",
    "null",
    '{"Value":{"prop":"","type":"String"}}',
    '{"Value":{"prop":"__proto__","type":"String"}}',
    '{"Value":{"prop":"v","type":"String"},"Name":{"prop":"v","type":"String"}}',
    '{"Value":{"prop":"v","type":"String","extra":true}}',
  ])("rejects structurally invalid mapping %s without writes", async (mapping) => {
    expect((await upload(await workbook(), mapping)).status).toBe(400);
    expect(await prismaDirect.employee.count()).toBe(0);
    expect(await prismaDirect.timeRecord.count()).toBe(0);
  });
  it.each([
    "startDate=2026-02-30&endDate=2026-03-01",
    "startDate=2026-03-01&endDate=2026-02-28",
    "startDate=0000-01-01&endDate=2026-01-01",
    "startDate=2026-01-01&startDate=2026-01-02&endDate=2026-01-03",
  ])("rejects invalid ranges at both export schemas %s", async (range) => {
    const spy = vi.spyOn(ExportService.prototype, "generateReportPDF");
    for (const path of ["calendar-pdf", "report-pdf", "report-excel"])
      expect((await http("GET", `/api/export/${path}?${range}`)).status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });
  it("rejects wrong file field, second file and over-50MiB payload before decoder", async () => {
    expect((await upload(Buffer.from("bad"), undefined, "unexpected")).status).toBe(400);
    expect((await upload(await workbook(), undefined, "file", token, true)).status).toBe(400);
    const large = await upload(Buffer.alloc(50 * 1024 * 1024 + 1));
    expect(large.status).toBe(413);
    expect(large.body.code).toBe("FILE_TOO_LARGE");
  });
  it.each(["calendar-pdf", "report-pdf"])(
    "generates real %s PDF with exact download headers",
    async (path) => {
      await prismaDirect.employee.create({ data: employee });
      const response = await http(
        "GET",
        `/api/export/${path}?${query}&employeeId=${employee.id}`,
        undefined,
        token,
        true,
      );
      expect(response.status).toBe(200);
      expect(response.bytes.subarray(0, 5).toString()).toBe("%PDF-");
      expect(response.headers["content-type"]).toMatch(/^application\/pdf/);
      expect(Number(response.headers["content-length"])).toBe(response.bytes.length);
      expect(response.headers["content-disposition"]).toBe(
        path === "calendar-pdf"
          ? "attachment; filename=Calendario_Turnos_2020-01-01_2020-01-02.pdf"
          : "attachment; filename=Reporte_Asistencia_2020-01-01_to_2020-01-02.pdf",
      );
      expect(response.bytes.toString()).not.toContain(employee.pin);
    },
  );
  it.each([
    ["[]", "[]"],
    ["not-json", "null"],
    [
      JSON.stringify([{ detail: "Recovered", timestamp: "10" }, null]),
      JSON.stringify([{ company: "Legacy" }, null]),
    ],
  ])(
    "generates shift PDF from normalized legacy entries (%s); missing ID keeps service 500",
    async (logEntries, supplierEntries) => {
      expect((await http("GET", "/api/export/shift-report-pdf/missing")).status).toBe(500);
      await prismaDirect.shiftReport.create({
        data: {
          id: "shift-pdf",
          folio: "001",
          shiftName: "Day",
          responsibleUser: "Operator",
          startTime: new Date("2020-01-01T12:00:00Z"),
          date: new Date("2020-01-01T00:00:00Z"),
          status: "closed",
          logEntries,
          supplierEntries,
        },
      });
      const response = await http(
        "GET",
        "/api/export/shift-report-pdf/shift-pdf",
        undefined,
        token,
        true,
      );
      expect(response.status).toBe(200);
      expect(response.bytes.subarray(0, 5).toString()).toBe("%PDF-");
      expect(response.headers["content-disposition"]).toBe(
        "attachment; filename=Reporte_Turno_shift-pdf.pdf",
      );
    },
  );
  it("streams real team and employee XLSX with data columns/rows and no PIN", async () => {
    await prismaDirect.employee.create({ data: employee });
    await prismaDirect.timeRecord.create({
      data: {
        employeeId: employee.id,
        employeeName: employee.name,
        date: "2020-01-01",
        entrada: "2020-01-01T12:00:00Z",
        salida: "2020-01-01T20:00:00Z",
        status: "Completado",
        scheduledHours: 8,
        scheduledStartTime: "09:00",
        scheduledEndTime: "17:00",
        scheduledColacionMinutes: 0,
      },
    });
    for (const suffix of ["", `&employeeId=${employee.id}`]) {
      const response = await http(
        "GET",
        `/api/export/report-excel?${query}${suffix}`,
        undefined,
        token,
        true,
      );
      expect(response.status).toBe(200);
      expect(response.bytes.subarray(0, 2).toString()).toBe("PK");
      expect(response.headers["content-disposition"]).toBe(
        "attachment; filename=Reporte_KPI_2020-01-01_2020-01-02.xlsx",
      );
      const book = new ExcelJS.Workbook();
      await book.xlsx.load(response.bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
      const sheet = book.getWorksheet("KPIs")!;
      expect(sheet.rowCount).toBeGreaterThan(1);
      expect(sheet.getCell("A1").text).toBe(suffix ? "Fecha" : "Empleado");
      if (!suffix) expect(sheet.getCell("A2").text).toBe(employee.name);
      expect(JSON.stringify(sheet.getSheetValues())).not.toContain(employee.pin);
    }
  });
  it("enforces Usuario PDF scope/response shapes and preserves Excel authorization 500", async () => {
    await worker();
    const calendar = await http("GET", `/api/export/calendar-pdf?${query}`);
    expect(calendar.status).toBe(403);
    expect(calendar.body.code).toBe("FORBIDDEN");
    const report = await http("GET", `/api/export/report-pdf?${query}&employeeId=other`);
    expect(report.status).toBe(403);
    expect(report.body).toEqual({
      message: "Acceso denegado: Solo puede exportar su propio reporte de asistencia",
    });
    const excel = await http("GET", `/api/export/report-excel?${query}`);
    expect(excel.status).toBe(500);
    expect(excel.body.code).toBe("EXPORT_REPORT_EXCEL_ERROR");
    const spy = vi
      .spyOn(ExportService.prototype, "generateReportPDF")
      .mockResolvedValue(Buffer.from("%PDF-test"));
    for (const path of ["calendar-pdf", "report-pdf"]) {
      expect(
        (
          await http(
            "GET",
            `/api/export/${path}?${query}&employeeId=${employee.id}&area=other&cargo=other&mode=summary`,
            undefined,
            token,
            true,
          )
        ).status,
      ).toBe(200);
      expect(spy).toHaveBeenLastCalledWith(
        path === "calendar-pdf" ? "calendar" : "detailed",
        expect.objectContaining({
          employeeId: employee.id,
          area: undefined,
          cargo: undefined,
          mode: undefined,
        }),
      );
    }
    const stream = vi
      .spyOn(streamExportService, "streamKpiReportToExcel")
      .mockImplementation(async (sink) => {
        sink.end("fixture");
      });
    expect(
      (
        await http(
          "GET",
          `/api/export/report-excel?${query}&employeeId=${employee.id}&area=other`,
          undefined,
          token,
          true,
        )
      ).status,
    ).toBe(200);
    expect(stream).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ area: "other", employeeId: employee.id }),
    );
  });
  it("denies unlinked Usuario exports without renderer effects", async () => {
    await worker("Usuario", false);
    const spy = vi.spyOn(ExportService.prototype, "generateReportPDF");
    for (const path of ["calendar-pdf", "report-pdf", "report-excel"]) {
      const response = await http("GET", `/api/export/${path}?${query}&employeeId=other`);
      expect(response.status).toBe(path === "report-excel" ? 500 : 403);
    }
    expect(spy).not.toHaveBeenCalled();
  });
  it("characterizes router/controller mode mismatch and query validation with no renderer effects", async () => {
    const spy = vi.spyOn(ExportService.prototype, "generateReportPDF");
    expect((await http("GET", "/api/export/calendar-pdf")).status).toBe(400);
    expect((await http("GET", `/api/export/report-pdf?${query}&mode=detailed`)).status).toBe(400);
    const excel = await http("GET", `/api/export/report-excel?${query}&mode=detailed`);
    expect(excel.status).toBe(500);
    expect(excel.body.code).toBe("EXPORT_REPORT_EXCEL_ERROR");
    expect((await http("GET", `/api/export/report-excel?${query}&mode=invalid`)).status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });
  it("rejects impossible/reversed calendar dates without rendering", async () => {
    const spy = vi
      .spyOn(ExportService.prototype, "generateReportPDF")
      .mockResolvedValue(Buffer.from("%PDF-test"));
    await worker("quiosco", false);
    expect(
      (
        await http(
          "GET",
          "/api/export/calendar-pdf?startDate=2020-02-30&endDate=2020-01-01",
          undefined,
          token,
          true,
        )
      ).status,
    ).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });
  it("handles renderer failure before bytes with structured JSON and ends after partial bytes", async () => {
    vi.spyOn(ExportService.prototype, "generateReportPDF").mockRejectedValue(
      new Error("renderer fail"),
    );
    expect((await http("GET", `/api/export/calendar-pdf?${query}`)).status).toBe(500);
    const auditing = vi.spyOn(auditService, "logError").mockResolvedValue(undefined);
    const stream = vi
      .spyOn(streamExportService, "streamKpiReportToExcel")
      .mockRejectedValue(new Error("pre-byte failure"));
    const failure = await http("GET", `/api/export/report-excel?${query}`);
    expect(failure.status).toBe(500);
    expect(failure.body.code).toBe("EXPORT_REPORT_EXCEL_ERROR");
    expect(auditing).toHaveBeenCalledWith(
      expect.objectContaining({ code: "EXPORT_REPORT_EXCEL_ERROR" }),
      expect.objectContaining({ method: "GET" }),
      "SYSTEM_ERROR",
    );
    auditing.mockClear();
    stream.mockImplementation(async (sink) => {
      sink.setHeader("Content-Type", "application/octet-stream");
      sink.write("partial");
      await new Promise((resolve) => setTimeout(resolve, 10));
      throw new Error("post-byte failure");
    });
    const partial = await http("GET", `/api/export/report-excel?${query}`, undefined, token, true);
    expect(partial.status).toBe(200);
    expect(partial.bytes.toString()).toBe("partial");
    expect(auditing).not.toHaveBeenCalled();
  });
  it("rejects actual detailed PDF calculation failure without exposing internal error as PDF", async () => {
    vi.spyOn(kpiService, "getDetailedReport").mockRejectedValue(
      new Error("private DB failure detail"),
    );
    const response = await http("GET", `/api/export/report-pdf?${query}`, undefined, token, true);
    expect(response.status).toBe(500);
    expect(response.headers["content-type"]).toMatch(/json/);
    expect(response.bytes.toString()).not.toContain("private DB failure detail");
  });
  it("preserves partial ZIP when real KPI renderer fails after WorkbookWriter begins", async () => {
    vi.spyOn(kpiService, "getDetailedReport").mockRejectedValue(new Error("DB failure"));
    const response = await http("GET", `/api/export/report-excel?${query}`, undefined, token, true);
    expect(response.status).toBe(200);
    expect(response.bytes.subarray(0, 2).toString()).toBe("PK");
    expect(response.bytes.includes(Buffer.from([0x50, 0x4b, 0x05, 0x06]))).toBe(false);
  });
  it("allows Reloj_Control preview/shift exports but denies Usuario before decoder", async () => {
    await worker("Reloj_Control", false);
    expect((await upload(await workbook())).status).toBe(200);
    expect((await http("GET", "/api/export/shift-report-pdf/missing")).status).toBe(500);
    await prismaDirect.user.update({ where: { id: actorId }, data: { role: "Usuario" } });
    expect((await upload(Buffer.from("bad zip"))).status).toBe(403);
    expect((await http("GET", "/api/export/shift-report-pdf/missing")).status).toBe(403);
  });
  it.each([
    "/api/import/preview",
    "/api/export/calendar-pdf",
    "/api/export/report-pdf",
    "/api/export/report-excel",
    "/api/export/shift-report-pdf/missing",
  ])("requires live authentication on %s", async (path) => {
    expect(
      (await http(path.startsWith("/api/import") ? "POST" : "GET", path, undefined, null)).status,
    ).toBe(401);
  });
});
