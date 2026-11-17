import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { decodePDFRawStream, PDFDocument, PDFRawStream } from "pdf-lib";
import { mkdirSync, writeFileSync } from "node:fs";
const data = vi.hoisted(() => ({
  employees: vi.fn(),
  records: vi.fn(),
  patterns: vi.fn(),
  assignments: vi.fn(),
  shiftReport: vi.fn(),
  context: vi.fn(),
  schedule: vi.fn(),
}));
vi.mock("../../src/services/db", () => ({
  default: {
    employee: { findMany: data.employees },
    timeRecord: { findMany: data.records },
    shiftPattern: { findMany: data.patterns },
    assignedShift: { findMany: data.assignments },
    shiftReport: { findUnique: data.shiftReport },
  },
}));
vi.mock("../../src/services/schedulingService", () => ({
  schedulingService: {
    getSchedulingContext: data.context,
    getEmployeeDailyScheduleInfo: data.schedule,
  },
}));
vi.mock("../../src/services/kpiService", () => ({ kpiService: {} }));
import { ExportService } from "../../src/services/export/ExportService";
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-01-01T01:00:00Z"));
  data.employees.mockResolvedValue([
    {
      id: "e",
      name: "José Muñoz",
      area: "Operaciones",
      position: "Guardia",
      workdayType: "Normal",
    },
  ]);
  data.records.mockResolvedValue([
    {
      employeeId: "e",
      date: "2025-12-31",
      entrada: "08:00",
      salida: "19:00",
      status: "AnomaliaManual",
    },
  ]);
  data.patterns.mockResolvedValue([{ id: "p", name: "Turno día", cycleLengthDays: 7 }]);
  data.assignments.mockResolvedValue([
    { employeeId: "e", shiftPatternId: "p" },
    { employeeId: "e", shiftPatternId: "p" },
  ]);
  data.context.mockResolvedValue({});
  data.schedule.mockResolvedValue({
    isWorkDay: true,
    hours: 8,
    startTime: "08:00",
    endTime: "16:00",
  });
});
afterEach(() => vi.useRealTimers());
it.each(["attendance_summary", "overtime", "anomalies", "shift_coverage"])(
  "renders valid real PDF for %s with scoped filters",
  async (type) => {
    const bytes = await new ExportService().generateReportPDF(type, {
      employeeId: "e",
      area: "Operaciones",
      cargo: "Guardia",
    });
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    if (process.env.PDF_QA_DIR) {
      mkdirSync(process.env.PDF_QA_DIR, { recursive: true });
      writeFileSync(`${process.env.PDF_QA_DIR}/${type}.pdf`, bytes);
    }
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
    if (type === "shift_coverage")
      expect(data.assignments).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isDeleted: false,
            employeeId: "e",
            startDate: { lte: "2025-12-31" },
          }),
        }),
      );
    else {
      expect(data.employees).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: "e", position: "Guardia" }),
        }),
      );
      expect(data.records).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isDeleted: false,
            date: { gte: "2025-12-24", lte: "2025-12-31" },
          }),
        }),
      );
    }
    if (process.env.PDF_QA_DIR) {
      mkdirSync(process.env.PDF_QA_DIR, { recursive: true });
      writeFileSync(`${process.env.PDF_QA_DIR}/${type}.pdf`, bytes);
    }
  },
);
it("paginates long names and many rows into a valid PDF", async () => {
  data.employees.mockResolvedValue(
    Array.from({ length: 70 }, (_, i) => ({
      id: `e${i}`,
      name: `Empleado ${i} ` + "Nombre extenso ".repeat(i === 0 ? 160 : 3),
      area: "Operaciones",
      workdayType: "Normal",
    })),
  );
  const bytes = await new ExportService().generateReportPDF("attendance_summary", {});
  expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(4);
  if (process.env.PDF_QA_DIR) writeFileSync(`${process.env.PDF_QA_DIR}/pagination.pdf`, bytes);
});
it("calendar uses one context and the selected Chile civil day, including DST", async () => {
  const bytes = await new ExportService().generateReportPDF("calendar", {
    startDate: "2026-09-06",
    endDate: "2026-09-07",
  });
  expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(0);
  expect(data.context).toHaveBeenCalledExactlyOnceWith(["e"], "2026-09-06", "2026-09-07");
  expect(data.schedule.mock.calls.map((call) => call[1].toISOString())).toEqual([
    "2026-09-06T12:00:00.000Z",
    "2026-09-07T12:00:00.000Z",
  ]);
  expect(data.schedule.mock.calls.every((call) => call[2] && call[3].id === "e")).toBe(true);
});

import { reportWorkedHours } from "../../src/utils/reportHours";
it.each([
  ["08:00", "19:00", 11],
  ["23:50", "00:10", 1 / 3],
  ["00:50", "00:10", 23 + 1 / 3],
  ["2026-04-05T00:00:00Z", "2026-04-05T10:00:00Z", 10],
  ["2026-01-01T08:00:00-03:00", "2026-01-01T19:00:00-03:00", 11],
  ["bad", "12:00", 0],
  ["25:00", "26:00", 0],
  [null, "12:00", 0],
  ["2026-01-01T19:00:00Z", "2026-01-01T08:00:00Z", 0],
])("calculates finite worked hours for %s / %s", (start, end, expected) => {
  expect(reportWorkedHours(start as string | null, end as string)).toBeCloseTo(expected as number);
});

it("keeps shift-report business date while formatting start/end instants in Chile", async () => {
  data.shiftReport.mockResolvedValue({
    id: "r",
    folio: "001",
    updatedAt: new Date("2020-01-01T12:00:00Z"),
    responsibleUser: "Operador",
    shiftName: "Turno día",
    date: new Date("2020-01-01T00:00:00Z"),
    startTime: new Date("2020-01-01T12:00:00Z"),
    endTime: null,
    status: "open",
    logEntries: "[]",
    supplierEntries: "[]",
  });
  const bytes = await new ExportService().generateReportPDF("shift_report", { shiftReportId: "r" });
  expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(0);
  if (process.env.PDF_QA_DIR) writeFileSync(`${process.env.PDF_QA_DIR}/shift_report.pdf`, bytes);
});

it("paginates a long calendar for multiple employees with all days and page footers", async () => {
  data.employees.mockResolvedValue([
    { id: "e", name: "Empleado Uno", area: "Operaciones", position: "Guardia" },
    { id: "f", name: "Empleado Dos", area: "Operaciones", position: "Guardia" },
  ]);
  const bytes = await new ExportService().generateReportPDF("calendar", {
    startDate: "2026-10-01",
    endDate: "2026-11-30",
  });
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBe(6);
  const pageTexts = pdf.getPages().map((page) => {
    const content = page.node.Contents();
    expect(content).toBeInstanceOf(PDFRawStream);
    const stream = Buffer.from(decodePDFRawStream(content as PDFRawStream).decode()).toString();
    return [...stream.matchAll(/\[([^\]]*)\] TJ/g)].map((match) =>
      [...match[1].matchAll(/<([0-9a-f]+)>/gi)]
        .map((part) => Buffer.from(part[1], "hex").toString("latin1"))
        .join(""),
    );
  });
  for (const [index, texts] of pageTexts.entries()) {
    expect(texts).toContain(index < 3 ? "Empleado Uno" : "Empleado Dos");
    expect(texts).toContain("Mes");
    expect(texts).toContain(`Página ${index + 1}`);
    expect(texts).toContain("Turno");
  }
  for (const pages of [pageTexts.slice(0, 3), pageTexts.slice(3)]) {
    const texts = pages.flat();
    const dates = texts.flatMap((text, i) =>
      text === "Octubre" || text === "Noviembre" ? [`${text} ${texts[i + 1]}`] : [],
    );
    expect(dates).toEqual([
      ...Array.from({ length: 31 }, (_, i) => `Octubre ${String(i + 1).padStart(2, "0")}`),
      ...Array.from({ length: 30 }, (_, i) => `Noviembre ${String(i + 1).padStart(2, "0")}`),
    ]);
  }
  expect(data.schedule).toHaveBeenCalledTimes(122);
  if (process.env.PDF_QA_DIR) {
    mkdirSync(process.env.PDF_QA_DIR, { recursive: true });
    writeFileSync(`${process.env.PDF_QA_DIR}/calendar-long.pdf`, bytes);
  }
});

it("renders the requested calendar even when every day is rest", async () => {
  data.schedule.mockResolvedValue(null);
  const bytes = await new ExportService().generateReportPDF("calendar", {
    employeeId: "e",
    startDate: "2026-11-16",
    endDate: "2026-11-17",
  });
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBe(1);
  const content = pdf.getPage(0).node.Contents() as PDFRawStream;
  const stream = Buffer.from(decodePDFRawStream(content).decode()).toString();
  const texts = [...stream.matchAll(/\[([^\]]*)\] TJ/g)].map((match) =>
    [...match[1].matchAll(/<([0-9a-f]+)>/gi)]
      .map((part) => Buffer.from(part[1], "hex").toString("latin1"))
      .join(""),
  );
  expect(texts).toContain("José Muñoz");
  expect(texts.filter((text) => text === "Descanso")).toHaveLength(2);
  expect(texts).toContain("16");
  expect(texts).toContain("17");
});

it("keeps long calendar observations visible across rows and pages", async () => {
  const observation = `Inicio ${"observacion extraordinaria ".repeat(160)}FinalUnico`;
  data.schedule.mockResolvedValue({ isWorkDay: true, hours: 8, shiftPatternName: observation });
  const bytes = await new ExportService().generateReportPDF("calendar", {
    startDate: "2026-11-16",
    endDate: "2026-11-16",
  });
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBeGreaterThan(1);
  const pageTexts = pdf.getPages().map((page) => {
    const stream = Buffer.from(
      decodePDFRawStream(page.node.Contents() as PDFRawStream).decode(),
    ).toString();
    return [...stream.matchAll(/\[([^\]]*)\] TJ/g)].map((match) =>
      [...match[1].matchAll(/<([0-9a-f]+)>/gi)]
        .map((part) => Buffer.from(part[1], "hex").toString("latin1"))
        .join(""),
    );
  });
  const renderedObservation = pageTexts
    .map((texts, index) => {
      const start =
        index === 0
          ? texts.findIndex((text) => text.startsWith("Inicio"))
          : texts.indexOf("Observación") + 1;
      const end = texts.findIndex((text) => text === "TOTAL" || text.startsWith("Generado:"));
      return texts.slice(start, end).join("");
    })
    .join("")
    .replace(/\s/g, "");
  expect(renderedObservation).toBe(observation.replace(/\s/g, ""));
  for (const [index, texts] of pageTexts.entries()) {
    expect(texts).toContain(`Página ${index + 1}`);
    expect(texts).toContain("Observación");
  }
  expect(pageTexts.flat().filter((text) => text === "Noviembre")).toHaveLength(1);
});
