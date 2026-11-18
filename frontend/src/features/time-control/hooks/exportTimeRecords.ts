import { timeRecordService } from "../../../services/timeRecordService";
import { triggerBrowserDownload } from "../../../utils/triggerBrowserDownload";
import { exportToPDF } from "../../../utils/export";
import { formatDisplayDateTime } from "../../../utils/formatters";

interface ViewFilters {
  desde: string;
  hasta: string;
  name: string;
  area: string;
  workdayType: string;
  status: string;
  showAnomalies: boolean;
}
export async function exportTimeRecords(format: "csv" | "excel" | "pdf", filters: ViewFilters) {
  const { desde, hasta, ...rest } = filters;
  if (format !== "pdf") {
    const { blob, filename } = await timeRecordService.downloadExport({
      startDate: desde,
      endDate: hasta,
      format,
      ...rest,
      matchingView: true,
    });
    triggerBrowserDownload(blob, filename);
    return true;
  }
  const query = Object.fromEntries(
    Object.entries({ ...rest, matchingView: true })
      .filter(([, value]) => value !== "" && value !== false)
      .map(([key, value]) => [key, String(value)]),
  );
  const records = await timeRecordService.getExportData(desde, hasta, query);
  if (!records.length) return false;
  const columns = [
    "Área",
    "Nombre",
    "Jornada",
    "Fecha",
    "Cargo",
    "Entrada",
    "Inicio colación",
    "Fin colación",
    "Salida",
    "Estado",
    "Justificación",
  ];
  const rows = records.map((row) => [
    row.employeeArea,
    row.employeeName,
    row.employeeWorkdayType,
    row.date,
    row.employeePosition,
    formatDisplayDateTime(row.entrada),
    formatDisplayDateTime(row.inicioColacion),
    formatDisplayDateTime(row.finColacion),
    formatDisplayDateTime(row.salida),
    row.status,
    row.justification ? JSON.stringify(row.justification) : "",
  ]);
  const summary = Object.entries(filters)
    .filter(([, value]) => value !== "" && value !== false)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" | ");
  return exportToPDF("Reporte de Registros de Horario", columns, rows, summary);
}
