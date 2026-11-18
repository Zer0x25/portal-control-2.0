import ExcelJS from "exceljs";

const columns = [
  ["id", "ID"],
  ["employeeId", "ID Empleado"],
  ["employeeRut", "RUT Empleado"],
  ["employeeName", "Nombre Empleado"],
  ["employeePosition", "Cargo"],
  ["employeeArea", "Área"],
  ["employeeWorkdayType", "Tipo Jornada"],
  ["date", "Fecha"],
  ["entrada", "Entrada"],
  ["inicioColacion", "Inicio Colación"],
  ["finColacion", "Fin Colación"],
  ["salida", "Fin Jornada"],
  ["status", "Estado"],
  ["source", "Origen"],
  ["justification", "Justificación"],
  ["scheduledStartTime", "Inicio Programado"],
  ["scheduledEndTime", "Fin Programado"],
  ["scheduledHours", "Horas Programadas"],
  ["shiftPatternName", "Nombre Turno"],
] as const;

const value = (row: Record<string, unknown>, key: string): string => {
  const item = row[key];
  return item == null ? "" : typeof item === "object" ? JSON.stringify(item) : String(item);
};
export async function exportRecordsView(format: "csv" | "excel", rows: Record<string, unknown>[]) {
  if (format === "csv") {
    const csvCell = (text: string) =>
      `"${(/^\s*[=+\-@\t\r]/.test(text) ? "'" : "") + text.replace(/"/g, '""')}"`;
    const lines = [columns.map(([key]) => csvCell(key)).join(",")];
    for (const row of rows) lines.push(columns.map(([key]) => csvCell(value(row, key))).join(","));
    return Buffer.from("\uFEFF" + lines.join("\r\n") + "\r\n", "utf8");
  }
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Registros");
  sheet.columns = columns.map(([key, header]) => ({ header, key, width: 22 }));
  sheet.getRow(1).font = { bold: true };
  for (const row of rows)
    sheet.addRow(Object.fromEntries(columns.map(([key]) => [key, value(row, key)])));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
