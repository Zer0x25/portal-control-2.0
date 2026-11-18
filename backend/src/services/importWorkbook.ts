import ExcelJS from "exceljs";
import { ValidationError } from "../utils/AppError";
import type { ImportSheet } from "../modules/importExport";
export const MAX_IMPORT_PREVIEW_ROWS = 5000;
/** exceljs ambient Buffer shadows Node Buffer; bridge only its load parameter. */
type XlsxLoadBuffer = Parameters<ExcelJS.Xlsx["load"]>[0];
export async function readImportWorkbook(file: Uint8Array): Promise<ImportSheet> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(
      (Buffer.isBuffer(file) ? file : Buffer.from(file)) as unknown as XlsxLoadBuffer,
    );
  } catch {
    throw new ValidationError("El archivo no es un Excel válido");
  }
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) throw new ValidationError("El archivo Excel está vacío o no tiene hojas");
  const headers: (string | undefined)[] = [];
  worksheet.getRow(1).eachCell((cell, column) => {
    headers[column] = cell.text || cell.value?.toString() || "";
  });
  const rows: Record<number, unknown>[] = [];
  worksheet.eachRow((row, number) => {
    if (number === 1) return;
    if (rows.length >= MAX_IMPORT_PREVIEW_ROWS) {
      throw new ValidationError(
        `El archivo excede el máximo permitido de ${MAX_IMPORT_PREVIEW_ROWS} filas`,
      );
    }
    const cells: Record<number, unknown> = {};
    row.eachCell((cell, column) => {
      cells[column] = cell.value;
    });
    rows.push(cells);
  });
  return { headers, rows };
}
