import { describe, it, expect, vi, beforeEach } from "vitest";
import { StreamExportService } from "../../src/services/export/StreamExportService";

describe("StreamExportService (Manual Dependency Injection)", () => {
  let service: StreamExportService;
  let mockPool: any;

  beforeEach(() => {
    // Manually create a mock pool object
    mockPool = {
      connect: vi.fn(),
      on: vi.fn(),
      end: vi.fn(),
    };
    // Instantiate service with the mock pool (Dependency Injection)
    service = new StreamExportService(mockPool);
  });

  it("should stream to CSV in batches using cursor", async () => {
    const mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };
    const mockCursor = {
      read: vi.fn((size, cb) => {
        // Return 1 row on first call, then empty to stop
        if (mockCursor.read.mock.calls.length === 1) {
          cb(null, [{ id: "1", employeeName: "Test User" }]);
        } else {
          cb(null, []);
        }
      }),
      close: vi.fn((cb) => cb()),
    };

    mockPool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockReturnValue(mockCursor);

    const chunks: string[] = [];
    const mockRes = {
      setHeader: vi.fn(),
      write: vi.fn((data) => chunks.push(data)),
      end: vi.fn(),
      headersSent: false,
    } as any;

    await service.streamQueryToCSV(
      mockRes,
      "SELECT * FROM users",
      [],
      ["id", "employeeName"],
      "test.csv",
    );

    expect(mockRes.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv; charset=utf-8");
    expect(mockRes.write).toHaveBeenCalled();
    expect(mockRes.end).toHaveBeenCalled();

    const fullCsv = chunks.join("");
    expect(fullCsv).toContain("id,employeeName"); // Headers
    expect(fullCsv).toContain("1,Test User"); // Data
  });

  it("should handle streaming to XML", async () => {
    const mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };
    const mockCursor = {
      read: vi.fn((size, cb) => {
        if (mockCursor.read.mock.calls.length === 1) {
          cb(null, [{ id: "XML-1", name: "Mock" }]);
        } else {
          cb(null, []);
        }
      }),
      close: vi.fn((cb) => cb()),
    };

    mockPool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockReturnValue(mockCursor);

    const chunks: string[] = [];
    const mockRes = {
      setHeader: vi.fn(),
      write: vi.fn((data) => chunks.push(data)),
      end: vi.fn(),
    } as any;

    await service.streamQueryToXML(mockRes, "SELECT * FROM users", [], "Root", "Item", "test.xml");

    const fullXml = chunks.join("");
    expect(fullXml).toContain("<Root>");
    expect(fullXml).toContain("<Item>");
    expect(fullXml).toContain("<id>XML-1</id>");
    expect(fullXml).toContain("</Root>");
  });

  it("should call release even if an error occurs", async () => {
    const mockClient = {
      query: vi.fn(() => {
        throw new Error("DB Error");
      }),
      release: vi.fn(),
    };
    mockPool.connect.mockResolvedValue(mockClient);

    const mockRes = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      end: vi.fn(),
      headersSent: false,
    } as any;

    await expect(service.streamQueryToCSV(mockRes, "SELECT 1", [], [], "err.csv")).rejects.toThrow(
      "DB Error",
    );

    expect(mockClient.release).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
});
