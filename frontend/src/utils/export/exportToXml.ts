/**
 * Enterprise Studio XML Export Utility
 * Generates a well-structured XML file from tabular data.
 */

const normalizeTagName = (name: string): string => {
  // Replace spaces and special characters to make valid XML tag names
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-zA-Z0-9]/g, "_") // Replace non-alphanumeric with underscore
    .toLowerCase();
};

const escapeXml = (unsafe: unknown): string => {
  const stringVal = String(unsafe ?? "");
  return stringVal
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

export const exportToXML = (headers: string[], data: unknown[][], fileName: string): void => {
  const normalizedHeaders = headers.map(normalizeTagName);

  let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xmlContent += "<root>\n";

  data.forEach((row) => {
    xmlContent += "  <record>\n";
    row.forEach((cell, index) => {
      const tagName = normalizedHeaders[index] || `field_${index}`;
      xmlContent += `    <${tagName}>${escapeXml(cell)}</${tagName}>\n`;
    });
    xmlContent += "  </record>\n";
  });

  xmlContent += "</root>";

  const blob = new Blob([xmlContent], { type: "application/xml;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    fileName.toLowerCase().endsWith(".xml") ? fileName : `${fileName}.xml`,
  );

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
