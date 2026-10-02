import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "../../src/services/db";
import { streamExportService } from "../../src/services/export/StreamExportService";
import { ulid } from "ulid";

describe("Export Streaming Service", () => {
  let testEmployeeId = ulid();

  beforeAll(async () => {
    // Setup: Create an employee and some records
    await prisma.employee.create({
      data: {
        id: testEmployeeId,
        name: "Streaming Tester",
        rut: "STREAM-1",
        status: "Activo",
        workdayType: "Normal",
        position: "Tester",
        area: "Quality",
      },
    });

    // Create sample records in bulk for speed (avoiding triggers for setup speed)
    await prisma.timeRecord.createMany({
      data: Array.from({ length: 50 }).map((_, i) => ({
        employeeId: testEmployeeId,
        employeeName: "Streaming Tester",
        date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
        entrada: "2026-01-01T08:00:00Z",
        salida: "2026-01-01T17:00:00Z",
        status: "Completado",
        source: "TEST_SUITE",
      })),
    });
  });

  afterAll(async () => {
    try {
      await prisma.timeRecord.deleteMany({ where: { employeeId: testEmployeeId } });
      await prisma.employee.delete({ where: { id: testEmployeeId } });
    } catch (err) {
      console.warn("Cleanup warning:", err);
    }
    await streamExportService.close();
  });

  it("should stream time records to CSV in chunks", async () => {
    let chunks: string[] = [];
    const mockRes = {
      setHeader: () => {},
      write: (data: string) => {
        chunks.push(data);
      },
      end: () => {},
      headersSent: false,
    } as any;

    await streamExportService.streamToCSV(mockRes, {
      startDate: "2026-01-01",
      endDate: "2026-01-31",
      employeeId: testEmployeeId,
    });

    // Verify we got multiple writes (Streaming)
    // 1 for BOM, 1 for Headers, then Data Chunks
    expect(chunks.length).toBeGreaterThanOrEqual(3);

    const allContent = chunks.join("");
    expect(allContent).toContain("STREAM-1");
    expect(allContent).toContain("Streaming Tester");
    // Verify header presence
    expect(allContent).toContain("id,employeeId,employeeRut,employeeName");
  });

  it("should stream time records to XML with correct structure", async () => {
    let chunks: string[] = [];
    const mockRes = {
      setHeader: () => {},
      write: (data: string) => {
        chunks.push(data);
      },
      end: () => {},
      headersSent: false,
    } as any;

    await streamExportService.streamToXML(mockRes, {
      startDate: "2026-01-01",
      endDate: "2026-01-31",
      employeeId: testEmployeeId,
    });

    const allContent = chunks.join("");
    expect(allContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(allContent).toContain("<TimeRecords>");
    expect(allContent).toContain("<Record>");
    expect(allContent).toContain("<employeeName>Streaming Tester</employeeName>");
    expect(allContent).toContain("</TimeRecords>");
  });

  it("should stream to Excel format without crashing", async () => {
    const { PassThrough } = await import("node:stream");
    const mockRes = new PassThrough() as any;

    // Add express-like methods that exceljs or our service might call
    mockRes.setHeader = () => {};
    mockRes.headersSent = false;

    // We don't need to capture data, just ensure it doesn't fail
    await expect(
      streamExportService.streamToExcel(mockRes, {
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        employeeId: testEmployeeId,
      }),
    ).resolves.not.toThrow();
  }, 20000);
});
