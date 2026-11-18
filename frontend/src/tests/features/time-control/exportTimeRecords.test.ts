import { describe, expect, it, vi } from "vitest";
import { exportTimeRecords } from "../../../features/time-control/hooks/exportTimeRecords";
import { timeRecordService } from "../../../services/timeRecordService";
import { exportToPDF } from "../../../utils/export";
import { triggerBrowserDownload } from "../../../utils/triggerBrowserDownload";
vi.mock("../../../services/timeRecordService", () => ({
  timeRecordService: { getExportData: vi.fn(), downloadExport: vi.fn() },
}));
vi.mock("../../../utils/export", () => ({ exportToPDF: vi.fn() }));
vi.mock("../../../utils/triggerBrowserDownload", () => ({ triggerBrowserDownload: vi.fn() }));
const filters = {
  desde: "2026-10-01",
  hasta: "2026-10-31",
  name: "Ana",
  area: "Norte",
  workdayType: "Normal",
  status: "",
  showAnomalies: true,
};
describe("exportTimeRecords", () => {
  it("requests all matching view rows for print and passes filters", async () => {
    const records = Array.from({ length: 35 }, (_, i) => ({
      id: `r${i}`,
      employeeName: `Ana ${i}`,
      date: "2026-10-01",
      status: "AnomaliaManual",
    }));
    vi.mocked(timeRecordService.getExportData).mockResolvedValue(records as never);
    vi.mocked(exportToPDF).mockReturnValue(true);
    expect(await exportTimeRecords("pdf", filters)).toBe(true);
    expect(timeRecordService.getExportData).toHaveBeenCalledWith(
      filters.desde,
      filters.hasta,
      expect.objectContaining({
        name: "Ana",
        area: "Norte",
        workdayType: "Normal",
        showAnomalies: "true",
        matchingView: "true",
      }),
    );
    expect(vi.mocked(exportToPDF).mock.calls.at(-1)?.[2]).toHaveLength(35);
  });
  it("downloads XLSX with the same filters and propagates export errors", async () => {
    vi.mocked(timeRecordService.downloadExport).mockResolvedValueOnce({
      blob: new Blob(),
      filename: "records.xlsx",
    });
    expect(await exportTimeRecords("excel", filters)).toBe(true);
    expect(timeRecordService.downloadExport).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: filters.desde,
        endDate: filters.hasta,
        name: "Ana",
        showAnomalies: true,
        matchingView: true,
      }),
    );
    expect(triggerBrowserDownload).toHaveBeenCalledWith(expect.any(Blob), "records.xlsx");
    vi.mocked(timeRecordService.downloadExport).mockRejectedValueOnce(new Error("Límite superado"));
    await expect(exportTimeRecords("csv", filters)).rejects.toThrow("Límite superado");
  });
});
