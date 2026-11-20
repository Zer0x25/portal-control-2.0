import { describe, it, expect, vi, beforeEach } from "vitest";
import { emailService } from "../../services/emailService";
import { scheduledReportService } from "../../services/scheduledReportService";
import * as apiClient from "../../services/apiClient";

vi.mock("../../services/apiClient", async () => {
  const actual = await vi.importActual<typeof import("../../services/apiClient")>(
    "../../services/apiClient",
  );
  return {
    ...actual,
    request: vi.fn(),
  };
});

describe("emailService.getRules", () => {
  beforeEach(() => {
    vi.mocked(apiClient.request).mockReset();
  });

  it("propagates network/server errors instead of returning all-false rules", async () => {
    vi.mocked(apiClient.request).mockRejectedValueOnce(new Error("HTTP 500"));

    await expect(emailService.getRules()).rejects.toThrow("HTTP 500");
  });
});

describe("scheduledReportService", () => {
  beforeEach(() => {
    vi.mocked(apiClient.request).mockReset();
  });

  it("calls GET, POST, PUT, PATCH toggle and DELETE endpoints", async () => {
    vi.mocked(apiClient.request).mockResolvedValue([]);
    await scheduledReportService.getAll();
    expect(apiClient.request).toHaveBeenCalledWith({
      method: "GET",
      url: "/api/scheduled-reports",
    });

    const payload = {
      name: "Reporte Diario",
      reportType: "attendance_summary" as const,
      frequency: "daily" as const,
      cronExpression: "0 8 * * *",
      recipients: ["admin@empresa.cl"],
      isActive: true,
    };
    vi.mocked(apiClient.request).mockResolvedValue(undefined);
    await scheduledReportService.create(payload);
    expect(apiClient.request).toHaveBeenCalledWith({
      method: "POST",
      url: "/api/scheduled-reports",
      body: payload,
    });

    await scheduledReportService.update("rep-1", { name: "Actualizado" });
    expect(apiClient.request).toHaveBeenCalledWith({
      method: "PUT",
      url: "/api/scheduled-reports/rep-1",
      body: { name: "Actualizado" },
    });

    vi.mocked(apiClient.request).mockResolvedValue({ success: true });
    await scheduledReportService.toggle("rep-1");
    expect(apiClient.request).toHaveBeenCalledWith({
      method: "PATCH",
      url: "/api/scheduled-reports/rep-1/toggle",
    });

    vi.mocked(apiClient.request).mockResolvedValue(undefined);
    await scheduledReportService.remove("rep-1");
    expect(apiClient.request).toHaveBeenCalledWith({
      method: "DELETE",
      url: "/api/scheduled-reports/rep-1",
    });
  });
});
