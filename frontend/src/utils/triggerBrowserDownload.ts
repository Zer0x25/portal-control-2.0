/**
 * Descarga de binarios en el navegador (spec 034, T8).
 *
 * Un service **transporta** el binario; el hook de feature decide cuando
 * presentarlo. Por eso los 6 metodos `download*` devuelven
 * `{ blob, filename }` y el consumo llama a estos helpers: el service no crea
 * nodos DOM, no hace `.click()` y no manipula object URLs.
 */

/**
 * Descarga un blob como archivo, preservando el nombre que envia el backend
 * (`Content-Disposition`) o el nombre por defecto del service.
 */
export const triggerBrowserDownload = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();

  // Small delay for mobile browsers
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 100);
};

/**
 * Abre el blob en una pestaña nueva (variante "imprimir").
 *
 * El object URL **no** se revoca: el visor de PDF de la pestaña nueva lo
 * sigue leyendo. Devuelve `false` si el navegador bloquea la ventana.
 */
export const openBlobInNewTab = (blob: Blob): boolean => {
  const url = window.URL.createObjectURL(blob);
  const opened = window.open(url, "_blank");
  return opened !== null;
};
