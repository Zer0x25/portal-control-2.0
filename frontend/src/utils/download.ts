/**
 * Helper para disparar descargas de archivos Blob en el navegador (Spec 034 / T8 / AC1).
 * Desacopla la manipulación de DOM (`document.createElement`, `URL.createObjectURL`)
 * de los servicios HTTP y la ubica en la capa de utilidades y hooks de presentación.
 */
export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 100);
}
