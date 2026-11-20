import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import ExcelJS from "exceljs";
import { createFastifyRuntime } from "../../src/fastify/runtime";
import { prismaDirect } from "../../src/services/db";
import { AuthService } from "../../src/services/AuthService";
import { assertConnectedToTestDb, resetIntegrationDb } from "../integration/_support/testDb";
import { httpClient } from "./_support/http";
let app: FastifyInstance, token: string;
beforeAll(async () => {
  await assertConnectedToTestDb();
  app = createFastifyRuntime({
    allowedOrigins: [],
    trustProxy: 1,
    rateLimit: { max: 5000, timeWindow: 900000 },
    logger: false,
  });
  await app.ready();
});
beforeEach(async () => {
  await resetIntegrationDb();
  await prismaDirect.employee.createMany({
    data: [
      {
        id: "export-ana",
        name: "Ana Prueba",
        rut: "11111111-1",
        position: "Operador",
        area: "Norte",
        workdayType: "Normal",
      },
      {
        id: "export-otro",
        name: "Otra Persona",
        rut: "22222222-2",
        position: "Operador",
        area: "Sur",
        workdayType: "Normal",
      },
    ],
  });
  const user = await prismaDirect.user.create({
    data: { username: "export-admin", role: "Administrador", passwordHash: "test" },
  });
  token = (await AuthService.createSession(user.id, user.username, user.role, null, "export-test"))
    .token;
  await prismaDirect.timeRecord.createMany({
    data: [
      ...Array.from({ length: 35 }, (_, i) => ({
        id: `matching-${i}`,
        employeeId: "export-ana",
        employeeName: "Ana Prueba",
        employeeArea: "Norte",
        employeeWorkdayType: "Normal",
        employeePosition: "Operador",
        date: "2026-10-01",
        status: "Completado",
      })),
      {
        id: "excluded",
        employeeId: "export-otro",
        employeeName: "Otra Persona",
        employeeArea: "Sur",
        employeeWorkdayType: "Normal",
        date: "2026-10-01",
        status: "Ausente",
      },
    ],
  });
});
afterAll(async () => {
  await resetIntegrationDb();
  await app.close();
});
describe("filtered view exports", () => {
  const http = httpClient(
    () => app,
    () => token,
  );
  it("exports all filtered pages consistently as JSON, CSV and XLSX", async () => {
    const filters =
      "startDate=2026-10-01&endDate=2026-10-01&matchingView=true&name=Ana&area=Norte&workdayType=Normal&status=Completado";
    const json = await http("GET", `/api/records/export?${filters}`);
    expect(json.status).toBe(200);
    expect(json.body).toHaveLength(35);
    expect(
      json.body.every((row: { employeeRut: string }) => row.employeeRut === "11111111-1"),
    ).toBe(true);
    const csv = await http(
      "GET",
      `/api/records/export?${filters}&format=csv`,
      undefined,
      token,
      true,
    );
    expect(csv.status).toBe(200);
    expect(csv.text.split("\r\n").filter(Boolean)).toHaveLength(36);
    expect(csv.text).not.toContain("Otra Persona");
    const xlsx = await http(
      "GET",
      `/api/records/export?${filters}&format=excel`,
      undefined,
      token,
      true,
    );
    expect(xlsx.status).toBe(200);
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(xlsx.bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
    expect(book.getWorksheet("Registros")?.rowCount).toBe(36);
    expect(JSON.stringify(book.getWorksheet("Registros")?.getRow(2).values)).toContain(
      "Ana Prueba",
    );
  });
});
