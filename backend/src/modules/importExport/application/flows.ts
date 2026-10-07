import { AppError, ForbiddenError, ValidationError } from "../../../utils/AppError";
import type { ExportActor, ExportFilters, ExportSink, ImportExportDependencies } from "./contracts";
export function createImportExportFlows<TSink extends ExportSink, TBytes extends Uint8Array>(
  deps: ImportExportDependencies<TSink, TBytes>,
) {
  const excelFailure = () =>
    new AppError("Error al exportar reporte a Excel", 500, "EXPORT_REPORT_EXCEL_ERROR");
  return {
    async preview(file?: Uint8Array, schema?: string) {
      if (!file) throw new ValidationError("No se subió ningún archivo");
      const mapping = schema ? deps.parseMapping(schema) : null;
      const sheet = await deps.readWorkbook(file);
      const rows = sheet.rows.map((cells) => {
        const row: Record<string, unknown> = {};
        if (mapping) {
          for (const header of Object.keys(mapping)) {
            const column = sheet.headers.indexOf(header);
            if (column !== -1) {
              const value = cells[column] ?? null;
              const info = mapping[header];
              row[info.prop] = info.type === "String" && value !== null ? String(value) : value;
            }
          }
        } else {
          for (const [column, value] of Object.entries(cells)) {
            const header = sheet.headers[Number(column)];
            if (header) row[header] = value;
          }
        }
        return row;
      });
      return { rows, total: rows.length };
    },
    async pdf(kind: "calendar" | "detailed", query: unknown, actor?: ExportActor) {
      const filters = deps.parseFilters(query);
      if (actor?.role === "Usuario") {
        if (!filters.employeeId || filters.employeeId !== actor.employeeId) {
          if (kind === "detailed")
            return {
              denied: true as const,
              message: "Acceso denegado: Solo puede exportar su propio reporte de asistencia",
            };
          throw new ForbiddenError("Acceso denegado: Solo puede exportar su propio calendario");
        }
        filters.area = undefined;
        filters.cargo = undefined;
        if (kind === "detailed") filters.mode = undefined;
      }
      const rendering = { ...filters, ...(kind === "calendar" ? { mode: undefined } : {}) };
      const bytes = await deps.pdf(kind, rendering);
      const filename =
        kind === "calendar"
          ? `Calendario_Turnos_${filters.startDate}_${filters.endDate}.pdf`
          : `Reporte_Asistencia_${filters.startDate}_to_${filters.endDate}.pdf`;
      return { denied: false as const, bytes, filename };
    },
    async shiftPdf(id: string) {
      if (!id) throw new ValidationError("ID de reporte requerido");
      return {
        bytes: await deps.pdf("shift_report", { shiftReportId: id }),
        filename: `Reporte_Turno_${id}.pdf`,
      };
    },
    async prepareExcel(query: unknown, actor?: ExportActor) {
      try {
        const filters = deps.parseFilters(query);
        if (
          actor?.role === "Usuario" &&
          (!filters.employeeId || filters.employeeId !== actor.employeeId)
        )
          throw new ForbiddenError("Acceso denegado: Solo puede exportar su propio reporte");
        return filters;
      } catch {
        throw excelFailure();
      }
    },
    async excel(sink: TSink, filters: ExportFilters) {
      try {
        await deps.excel(sink, filters);
      } catch {
        if (!sink.headersSent) throw excelFailure();
        sink.end();
      }
    },
  };
}
export type ImportExportFlows<
  TSink extends ExportSink = ExportSink,
  TBytes extends Uint8Array = Uint8Array,
> = ReturnType<typeof createImportExportFlows<TSink, TBytes>>;
