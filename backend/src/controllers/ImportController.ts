import { Request, Response } from "express";
import ExcelJS from "exceljs";
import { asyncHandler } from "../middleware/errorHandler";
import { ValidationError } from "../utils/AppError";

interface SchemaInfo {
  prop: string;
  type: string;
}

/**
 * The buffer type exceljs's `xlsx.load` accepts.
 *
 * exceljs ships an ambient `interface Buffer extends ArrayBuffer` that shadows
 * Node's real `Buffer` and rejects it outright. Deriving the parameter type from
 * the function itself keeps this cast honest and survives upstream changes.
 */
type XlsxLoadBuffer = Parameters<ExcelJS.Xlsx["load"]>[0];

export const previewImport = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ValidationError("No se subió ningún archivo");
  }

  const bodySchema = req.body.schema
    ? (JSON.parse(req.body.schema) as Record<string, SchemaInfo>)
    : null;
  const workbook = new ExcelJS.Workbook();
  // The value is a genuine multer Buffer; the cast only bridges exceljs's
  // broken ambient Buffer declaration (see `XlsxLoadBuffer`).
  await workbook.xlsx.load(req.file.buffer as unknown as XlsxLoadBuffer);

  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    throw new ValidationError("El archivo Excel está vacío o no tiene hojas");
  }

  const rows: Record<string, string | number | boolean | Date | null>[] = [];
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];

  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber] = cell.text || cell.value?.toString() || "";
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip headers

    const rowData: Record<string, string | number | boolean | Date | null> = {};
    if (bodySchema) {
      Object.keys(bodySchema).forEach((expectedHeader) => {
        const schemaInfo = bodySchema[expectedHeader];
        const colIndex = headers.indexOf(expectedHeader);
        if (colIndex !== -1) {
          const cellValue = row.getCell(colIndex).value as string | number | boolean | Date | null;
          rowData[schemaInfo.prop] = cellValue;
          if (schemaInfo.type === "String" && cellValue !== null) {
            rowData[schemaInfo.prop] = String(cellValue);
          }
        }
      });
    } else {
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          rowData[header] = cell.value as string | number | boolean | Date | null;
        }
      });
    }
    rows.push(rowData);
  });

  res.json({ rows, total: rows.length });
});
