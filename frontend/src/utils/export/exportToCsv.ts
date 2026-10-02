const escapeCsvCell = (cell: unknown): string => {
  const stringCell = String(cell ?? "");
  if (stringCell.includes(",") || stringCell.includes('"') || stringCell.includes("\n")) {
    return `"${stringCell.replace(/"/g, '""')}"`;
  }
  return stringCell;
};

/**
 * Writes a CSV file client-side.
 *
 * `data` holds one array per row whose cells are heterogeneous scalars drawn from
 * the caller's domain (strings, numbers, `null` for missing values), so `unknown`
 * is the honest cell type — every cell is stringified by `escapeCsvCell`.
 */
export const exportToCSV = (headers: string[], data: unknown[][], fileName: string): void => {
  const rows = data.map((row) => row.map(escapeCsvCell).join(","));
  const csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    fileName.toLowerCase().endsWith(".csv") ? fileName : `${fileName}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
