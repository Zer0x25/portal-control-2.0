import { AppError, ForbiddenError, ValidationError } from "../../../utils/AppError";
import type { ExportActor, ExportFilters, ExportSink, ImportExportDependencies } from "./contracts";

export const MAX_IMPORT_PREVIEW_ROWS = 5000;

function isEmptyCell(value: unknown): boolean {
  return (
    value === null || value === undefined || (typeof value === "string" && value.trim() === "")
  );
}

function coerceMappedValue(
  value: unknown,
  type: string | undefined,
  header: string,
  rowNumber: number,
): unknown {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  switch (type) {
    case "String":
      return String(value);
    case "Number": {
      const parsed = typeof value === "number" ? value : Number(String(value).trim());
      if (Number.isNaN(parsed)) {
        throw new ValidationError(`Fila ${rowNumber}: "${header}" debe ser un número válido`);
      }
      return parsed;
    }
    case "Boolean": {
      if (typeof value === "boolean") return value;
      if (typeof value === "number") return value !== 0;
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "1", "si", "sí", "yes"].includes(normalized)) return true;
        if (["false", "0", "no"].includes(normalized)) return false;
      }
      throw new ValidationError(`Fila ${rowNumber}: "${header}" debe ser un booleano válido`);
    }
    case "Date": {
      const parsed = value instanceof Date ? value : new Date(String(value));
      if (Number.isNaN(parsed.getTime())) {
        throw new ValidationError(`Fila ${rowNumber}: "${header}" debe ser una fecha válida`);
      }
      return parsed.toISOString();
    }
    default:
      return value;
  }
}

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
      if (sheet.rows.length > MAX_IMPORT_PREVIEW_ROWS) {
        throw new ValidationError(
          `El archivo excede el máximo permitido de ${MAX_IMPORT_PREVIEW_ROWS} filas`,
        );
      }
      if (mapping) {
        for (const [header, info] of Object.entries(mapping)) {
          if (info.required && sheet.headers.indexOf(header) === -1) {
            throw new ValidationError(`Columna requerida "${header}" no encontrada en el archivo`);
          }
        }
      }
      const rows = sheet.rows.map((cells, index) => {
        const rowNumber = index + 2;
        const row: Record<string, unknown> = Object.create(null);
        if (mapping) {
          for (const header of Object.keys(mapping)) {
            const column = sheet.headers.indexOf(header);
            if (column !== -1) {
              const rawValue = cells[column] ?? null;
              const info = mapping[header];
              if (info.required && isEmptyCell(rawValue)) {
                throw new ValidationError(
                  `Fila ${rowNumber}: el campo requerido "${header}" está vacío`,
                );
              }
              row[info.prop] = coerceMappedValue(rawValue, info.type, header, rowNumber);
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
        filters.workdayType = undefined;
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
      } catch (error) {
        if (error instanceof AppError) throw error;
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
