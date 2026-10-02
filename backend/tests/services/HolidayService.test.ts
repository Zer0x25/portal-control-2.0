import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { holidayService } from "../../src/services/HolidayService";
import prisma from "../../src/services/db";
import { auditService } from "../../src/services/auditService";
import { SocketService } from "../../src/services/socketService";

// Mock dependencies
vi.mock("../../src/services/db", () => ({
  default: {
    holiday: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("../../src/services/auditService", () => ({
  auditService: {
    log: vi.fn(),
  },
}));

vi.mock("../../src/services/socketService", () => ({
  SocketService: {
    emit: vi.fn(),
  },
}));

vi.mock("ulid", () => ({
  ulid: () => "mocked-ulid",
}));

describe("HolidayService.syncExternalHolidays", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    // Suppress console.warn and console.error during tests
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Save original fetch
    originalFetch = global.fetch;

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore fetch
    global.fetch = originalFetch;

    // Restore console mocks
    vi.restoreAllMocks();
  });

  it("should successfully sync holidays from external API", async () => {
    const mockHolidays = [
      { date: "2024-01-01", title: "Año Nuevo", inalienable: true },
      { date: "2024-03-29", title: "Viernes Santo", inalienable: false },
    ];

    const mockResponse = {
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: vi.fn().mockResolvedValue({ status: "success", data: mockHolidays }),
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

    // Mock prisma upsert to return the mocked holidays
    (prisma.holiday.upsert as any).mockImplementation(({ create }: any) => Promise.resolve(create));

    const result = await holidayService.syncExternalHolidays(2024, "test-user");

    expect(global.fetch).toHaveBeenCalledWith("https://api.boostr.cl/holidays/2024.json");

    expect(prisma.holiday.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.holiday.upsert).toHaveBeenNthCalledWith(1, {
      where: { date: "2024-01-01" },
      update: { name: "Año Nuevo", type: "Nacional" },
      create: { id: "mocked-ulid", date: "2024-01-01", name: "Año Nuevo", type: "Nacional" },
    });
    expect(prisma.holiday.upsert).toHaveBeenNthCalledWith(2, {
      where: { date: "2024-03-29" },
      update: { name: "Viernes Santo", type: "Regional" },
      create: { id: "mocked-ulid", date: "2024-03-29", name: "Viernes Santo", type: "Regional" },
    });

    expect(auditService.log).toHaveBeenCalledWith({
      actorUsername: "test-user",
      action: "HOLIDAY_SYNC",
      category: "OPERATIONS",
      details: { count: 2, year: 2024 },
    });

    expect(SocketService.emit).toHaveBeenCalledWith("holiday:updated", {
      type: "sync",
      count: 2,
    });

    expect(result).toEqual({ success: true, total: 2, year: 2024 });
  });

  it("should throw an error if the API response is not OK", async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue("Internal Server Error"),
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

    await expect(holidayService.syncExternalHolidays(2024)).rejects.toThrow(
      "API de Boostr respondió con status: 500",
    );

    expect(console.error).toHaveBeenCalledWith(
      "[HolidayService] API Error 500:",
      "Internal Server Error",
    );
    expect(prisma.holiday.upsert).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
    expect(SocketService.emit).not.toHaveBeenCalled();
  });

  it("should throw an error if the content-type is not JSON", async () => {
    const mockResponse = {
      ok: true,
      headers: new Headers({ "content-type": "text/html" }),
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

    await expect(holidayService.syncExternalHolidays(2024)).rejects.toThrow(
      "API de Boostr no devolvió JSON (text/html)",
    );

    expect(prisma.holiday.upsert).not.toHaveBeenCalled();
  });

  it("should throw an error if the response format is invalid (no status='success')", async () => {
    const mockResponse = {
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: vi.fn().mockResolvedValue({ status: "error", message: "Not found" }),
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

    await expect(holidayService.syncExternalHolidays(2024)).rejects.toThrow(
      "Formato de respuesta de API de Boostr inválido",
    );

    expect(console.error).toHaveBeenCalledWith("[HolidayService] Invalid API response format:", {
      status: "error",
      message: "Not found",
    });
    expect(prisma.holiday.upsert).not.toHaveBeenCalled();
  });

  it("should throw an error if the response format is invalid (data is not an array)", async () => {
    const mockResponse = {
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: vi.fn().mockResolvedValue({ status: "success", data: "not an array" }),
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

    await expect(holidayService.syncExternalHolidays(2024)).rejects.toThrow(
      "Formato de respuesta de API de Boostr inválido",
    );

    expect(console.error).toHaveBeenCalledWith("[HolidayService] Invalid API response format:", {
      status: "success",
      data: "not an array",
    });
    expect(prisma.holiday.upsert).not.toHaveBeenCalled();
  });

  it("should handle error when reading text from a non-OK response fails", async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      text: vi.fn().mockRejectedValue(new Error("Network Error")),
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

    await expect(holidayService.syncExternalHolidays(2024)).rejects.toThrow(
      "API de Boostr respondió con status: 404",
    );

    expect(console.error).toHaveBeenCalledWith("[HolidayService] API Error 404:", "N/A");
  });
});
