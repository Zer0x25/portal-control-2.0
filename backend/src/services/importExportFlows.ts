import { createImportExportFlows, type ImportMapping } from "../modules/importExport";
import { readImportWorkbook } from "./importWorkbook";
import { ControllerExportQuerySchema } from "../models/schemas/exportFilters.schemas";
import { ExportService } from "./export/ExportService";
import { ValidationError } from "../utils/AppError";
import type { ExcelHttpStream } from "../utils/httpStream";
const renderer = new ExportService();
export const importExportFlows = createImportExportFlows<ExcelHttpStream, Buffer>({
  parseMapping: (value) => JSON.parse(value) as Record<string, ImportMapping>,
  readWorkbook: readImportWorkbook,
  parseFilters: (value) => {
    const result = ControllerExportQuerySchema.safeParse(value);
    if (!result.success)
      throw new ValidationError("Parámetros de exportación inválidos", [result.error.format()]);
    return result.data;
  },
  pdf: (kind, filters) => renderer.generateReportPDF(kind, filters),
  excel: async (sink, filters) => {
    const { streamExportService } = await import("./export/StreamExportService");
    await streamExportService.streamKpiReportToExcel(sink, {
      startDate: filters.startDate,
      endDate: filters.endDate,
      employeeId: filters.employeeId,
      area: filters.area,
      mode: filters.mode,
    });
  },
});
