import { z } from "zod";
import { createImportExportFlows } from "../modules/importExport";
import { readImportWorkbook } from "./importWorkbook";
import { ControllerExportQuerySchema } from "../models/schemas/exportFilters.schemas";
import { ExportService } from "./export/ExportService";
import { ValidationError } from "../utils/AppError";
import type { ExcelHttpStream } from "../utils/httpStream";
const renderer = new ExportService();
export const importExportFlows = createImportExportFlows<ExcelHttpStream, Buffer>({
  parseMapping: (value) => {
    const schema = z
      .record(
        z.string(),
        z
          .object({
            prop: z.string().trim().min(1),
            type: z.string().min(1).optional(),
            required: z.boolean().optional(),
          })
          .strict(),
      )
      .refine((mapping) => {
        const props = Object.values(mapping).map((entry) => entry.prop);
        return (
          new Set(props).size === props.length &&
          props.every((prop) => !["__proto__", "constructor", "prototype"].includes(prop))
        );
      });
    try {
      return schema.parse(JSON.parse(value));
    } catch {
      throw new ValidationError("Mapping de importación inválido");
    }
  },
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
